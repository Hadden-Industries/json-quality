// SPDX-License-Identifier: AGPL-3.0-only
// Node-API 9 binding: byte frames only, no parser/rule implementation here.
// Async work keeps parsing/normalization off the JavaScript event loop.
#include "../core/session.hpp"
#include <atomic>
#include <cstdint>
#include <node_api.h>
// A handle belongs to this loaded module, including when another binary copy
// with the same compiled source cohort is loaded into the process.
static unsigned char moduleIdentity;
static const napi_type_tag bindingTag = {
    static_cast<std::uint64_t>(reinterpret_cast<std::uintptr_t>(&moduleIdentity)),
    0xa8432cc67b3242dfULL};
struct Binding {
  CoreSession core;
  std::atomic<bool> busy{false};
  explicit Binding(std::string path) : core(std::move(path)) {}
};
struct Job {
  napi_env env = nullptr;
  napi_async_work work = nullptr;
  napi_deferred deferred = nullptr;
  napi_ref instance = nullptr, input = nullptr, failure = nullptr;
  Binding *binding = nullptr;
  const unsigned char *bytes = nullptr;
  std::size_t size = 0;
  Bytes capturedInput, output;
  std::string error;
};
static void status(napi_status result) {
  if (result != napi_ok)
    throw Fault("node-api-operation");
}
static Binding *unwrap(napi_env env, napi_value value) {
  bool matches = false;
  status(napi_check_object_type_tag(env, value, &bindingTag, &matches));
  require(matches, "native-session-type");
  void *pointer = nullptr;
  require(napi_unwrap(env, value, &pointer) == napi_ok && pointer != nullptr,
          "native-session-closed");
  return static_cast<Binding *>(pointer);
}
static napi_value create(napi_env env, napi_callback_info info) {
  try {
    std::size_t argc = 1;
    napi_value args[1];
    status(napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));
    require(argc == 1, "session-arguments");
    std::size_t length = 0;
    status(napi_get_value_string_utf8(env, args[0], nullptr, 0, &length));
    require(length > 0 && length <= 131072, "scratch-path-capacity");
    std::string path(length + 1, 0);
    status(napi_get_value_string_utf8(env, args[0], path.data(), path.size(), &length));
    path.resize(length);
    auto binding = std::make_unique<Binding>(std::move(path));
    napi_value object;
    status(napi_create_object(env, &object));
    status(napi_type_tag_object(env, object, &bindingTag));
    status(napi_wrap(
        env, object, binding.get(),
        [](napi_env, void *pointer, void *) { delete static_cast<Binding *>(pointer); }, nullptr,
        nullptr));
    binding.release();
    return object;
  } catch (const std::exception &error) {
    napi_throw_error(env, nullptr, error.what());
    return nullptr;
  }
}
static napi_value hello(napi_env env, napi_callback_info info) {
  try {
    std::size_t argc = 1;
    napi_value args[1];
    status(napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));
    require(argc == 1, "hello-arguments");
    auto binding = unwrap(env, args[0]);
    auto bytes = encodeFrames({jsonFrame(binding->core.hello())});
    napi_value output;
    status(napi_create_buffer_copy(env, bytes.size(), bytes.data(), nullptr, &output));
    return output;
  } catch (const std::exception &error) {
    napi_throw_error(env, nullptr, error.what());
    return nullptr;
  }
}
static napi_value exchange(napi_env env, napi_callback_info info) {
  std::unique_ptr<Job> job;
  try {
    std::size_t argc = 2;
    napi_value args[2];
    status(napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));
    require(argc == 2, "exchange-arguments");
    job = std::make_unique<Job>();
    job->env = env;
    auto binding = unwrap(env, args[0]);
    require(!binding->busy.exchange(true), "concurrent-native-request");
    job->binding = binding;
    bool buffer = false;
    status(napi_is_buffer(env, args[1], &buffer));
    require(buffer, "frame-buffer");
    void *bytes = nullptr;
    status(napi_get_buffer_info(env, args[1], &bytes, &job->size));
    job->bytes = static_cast<unsigned char *>(bytes);
    require(job->size >= 5 && job->size <= 131082, "frame-buffer-capacity");
    // The caller retains its Buffer and may mutate it immediately after the
    // call. Freeze only this bounded transport batch before worker dispatch.
    job->capturedInput.assign(job->bytes, job->bytes + job->size);
    job->bytes = job->capturedInput.data();
    status(napi_create_reference(env, args[0], 1, &job->instance));
    status(napi_create_reference(env, args[1], 1, &job->input));
    napi_value promise, name;
    status(napi_create_promise(env, &job->deferred, &promise));
    status(napi_create_string_utf8(env, "JSON Quality bounded exchange", NAPI_AUTO_LENGTH, &name));
    napi_value failureText, failure;
    status(napi_create_string_utf8(env, "native-work-incomplete", NAPI_AUTO_LENGTH, &failureText));
    status(napi_create_error(env, nullptr, failureText, &failure));
    status(napi_create_reference(env, failure, 1, &job->failure));
    status(napi_create_async_work(
        env, nullptr, name,
        [](napi_env, void *pointer) {
          auto &task = *static_cast<Job *>(pointer);
          // One queued job per Binding owns its SQLite connections. SQLite's
          // multi-thread build protects shared runtime state across independent
          // sessions; no process-wide worker lock can block the JS thread.
          try {
            std::size_t offset = 0;
            unsigned frames = 0;
            while (offset < task.size) {
              require(++frames <= 32 && task.size - offset >= 5, "batch-frame-boundary");
              auto header = task.bytes + offset;
              std::uint32_t size = header[1] | std::uint32_t(header[2]) << 8 |
                                   std::uint32_t(header[3]) << 16 | std::uint32_t(header[4]) << 24;
              require(size <= 65536 && size <= task.size - offset - 5, "frame-buffer-length");
              auto output = encodeFrames(task.binding->core.exchange(static_cast<char>(header[0]),
                                                                     std::span(header + 5, size)));
              require(task.output.size() + output.size() <= 131082, "batch-output-capacity");
              task.output.insert(task.output.end(), output.begin(), output.end());
              offset += 5 + size;
            }
          } catch (const std::exception &error) {
            task.error = error.what();
            task.binding->core.cancelled.store(true);
          }
        },
        [](napi_env env, napi_status completed, void *pointer) {
          std::unique_ptr<Job> task(static_cast<Job *>(pointer));
          napi_value output = nullptr;
          bool resolved = false;
          if (completed == napi_ok && task->error.empty()) {
            if (napi_create_buffer_copy(env, task->output.size(), task->output.data(), nullptr,
                                        &output) == napi_ok) {
              resolved = napi_resolve_deferred(env, task->deferred, output) == napi_ok;
            }
          }
          if (!resolved) {
            output = nullptr;
            bool pending = false;
            if (napi_is_exception_pending(env, &pending) == napi_ok && pending)
              napi_get_and_clear_last_exception(env, &output);
            napi_value text = nullptr, specific = nullptr;
            if (!output && !task->error.empty() &&
                napi_create_string_utf8(env, task->error.c_str(), task->error.size(), &text) ==
                    napi_ok &&
                napi_create_error(env, nullptr, text, &specific) == napi_ok) {
              output = specific;
            }
            if (!output)
              if (napi_is_exception_pending(env, &pending) == napi_ok && pending)
                napi_get_and_clear_last_exception(env, &output);
            if (!output)
              napi_get_reference_value(env, task->failure, &output);
            if (!output)
              napi_get_undefined(env, &output);
            // Teardown can prevent further JS work. Never pass an uninitialized
            // handle; native references and buffers are released in either case.
            if (output)
              napi_reject_deferred(env, task->deferred, output);
          }
          task->binding->busy.store(false);
          napi_delete_reference(env, task->input);
          napi_delete_reference(env, task->instance);
          napi_delete_reference(env, task->failure);
          napi_delete_async_work(env, task->work);
        },
        job.get(), &job->work));
    status(napi_queue_async_work(env, job->work));
    job.release();
    return promise;
  } catch (const std::exception &error) {
    if (job) {
      if (job->binding)
        job->binding->busy.store(false);
      if (job->work)
        napi_delete_async_work(env, job->work);
      if (job->input)
        napi_delete_reference(env, job->input);
      if (job->instance)
        napi_delete_reference(env, job->instance);
      if (job->failure)
        napi_delete_reference(env, job->failure);
    }
    napi_throw_error(env, nullptr, error.what());
    return nullptr;
  }
}
static napi_value cancel(napi_env env, napi_callback_info info) {
  try {
    std::size_t argc = 1;
    napi_value args[1];
    status(napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));
    require(argc == 1, "cancel-arguments");
    unwrap(env, args[0])->core.cancelled.store(true);
    napi_value output;
    status(napi_get_undefined(env, &output));
    return output;
  } catch (const std::exception &error) {
    napi_throw_error(env, nullptr, error.what());
    return nullptr;
  }
}
static napi_value release(napi_env env, napi_callback_info info) {
  try {
    std::size_t argc = 1;
    napi_value args[1];
    status(napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));
    require(argc == 1, "release-arguments");
    auto binding = unwrap(env, args[0]);
    require(!binding->busy.load() &&
                (binding->core.closed || (!binding->core.configured && !binding->core.store)),
            "release-active-session");
    void *pointer = nullptr;
    status(napi_remove_wrap(env, args[0], &pointer));
    delete static_cast<Binding *>(pointer);
    napi_value output;
    status(napi_get_undefined(env, &output));
    return output;
  } catch (const std::exception &error) {
    napi_throw_error(env, nullptr, error.what());
    return nullptr;
  }
}
static napi_value initialize(napi_env env, napi_value exports) {
  try {
    napi_property_descriptor properties[] = {
        {"create", nullptr, create, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"hello", nullptr, hello, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"exchange", nullptr, exchange, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"cancel", nullptr, cancel, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"release", nullptr, release, nullptr, nullptr, nullptr, napi_default, nullptr}};
    status(napi_define_properties(env, exports, 5, properties));
    return exports;
  } catch (const std::exception &error) {
    napi_throw_error(env, nullptr, error.what());
    return nullptr;
  }
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, initialize)

cmake_minimum_required(VERSION 3.30)
project(JsonQualityNative VERSION 2.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY MultiThreaded)
string(LENGTH "${JSON_QUALITY_SOURCE_INPUTS_SHA256}" source_identity_length)
if(NOT source_identity_length EQUAL 64 OR NOT JSON_QUALITY_SOURCE_INPUTS_SHA256 MATCHES "^[a-f0-9]+$")
  message(FATAL_ERROR "The verified producer builder must provide the first-party source identity")
endif()

foreach(component BOOST ICU SQLITE DOUBLE_CONVERSION NODE_HEADERS)
  if(NOT IS_DIRECTORY "${JSON_QUALITY_${component}_ROOT}")
    message(FATAL_ERROR "Provide a verified ${component} source root through the producer builder")
  endif()
endforeach()
if(NOT EXISTS "${JSON_QUALITY_GENERATED_ROOT}/resource_defaults.hpp")
  message(FATAL_ERROR "Provide resource annotations projected by the verified producer builder")
endif()

add_library(json_quality_sqlite STATIC "${JSON_QUALITY_SQLITE_ROOT}/sqlite3.c")
target_compile_definitions(json_quality_sqlite PRIVATE
  SQLITE_OMIT_LOAD_EXTENSION SQLITE_THREADSAFE=2 SQLITE_DQS=0
  SQLITE_DEFAULT_MEMSTATUS=0 SQLITE_TEMP_STORE=3)

set(conversion_sources bignum-dtoa bignum cached-powers double-to-string fast-dtoa
  fixed-dtoa string-to-double strtod)
set(conversion_files)
foreach(source IN LISTS conversion_sources)
  list(APPEND conversion_files "${JSON_QUALITY_DOUBLE_CONVERSION_ROOT}/double-conversion/${source}.cc")
endforeach()
add_library(json_quality_double_conversion STATIC ${conversion_files})
target_include_directories(json_quality_double_conversion SYSTEM PUBLIC "${JSON_QUALITY_DOUBLE_CONVERSION_ROOT}")

set(icu_output "${CMAKE_BINARY_DIR}/icu")
file(MAKE_DIRECTORY "${icu_output}")
if(WIN32)
  if(NOT CMAKE_VS_MSBUILD_COMMAND OR NOT IS_DIRECTORY "${JSON_QUALITY_ICU_TOOLS_ROOT}")
    message(FATAL_ERROR "Windows builds require a Visual Studio generator and verified ICU producer tools")
  endif()
  configure_file(icu-windows.props.in "${CMAKE_BINARY_DIR}/icu-windows.props" COPYONLY)
  set(icu_common "${icu_output}/icuuc-static.lib")
  set(icu_data "${icu_output}/icudt79l_dat.obj")
  add_custom_command(OUTPUT "${icu_common}"
    COMMAND "${CMAKE_VS_MSBUILD_COMMAND}" "${JSON_QUALITY_ICU_ROOT}/source/common/common.vcxproj"
      /nologo /m:1 /nodeReuse:false /verbosity:minimal /p:Configuration=Release
      /p:Platform=x64 /p:ConfigurationType=StaticLibrary /p:TargetName=icuuc-static
      "/p:PlatformToolset=${CMAKE_VS_PLATFORM_TOOLSET}"
      "/p:WindowsTargetPlatformVersion=${CMAKE_VS_WINDOWS_TARGET_PLATFORM_VERSION}"
      "/p:OutDir=${icu_output}/" "/p:IntDir=${icu_output}/objects/"
      "/p:CopyDestionationPath=${icu_output}/include/unicode"
      "/p:SolutionDir=${JSON_QUALITY_ICU_ROOT}/source/allinone/"
      "/p:ForceImportAfterCppTargets=${CMAKE_BINARY_DIR}/icu-windows.props"
      /p:BuildProjectReferences=false
    DEPENDS "${CMAKE_BINARY_DIR}/icu-windows.props"
    VERBATIM)
  add_custom_command(OUTPUT "${icu_data}"
    COMMAND "${JSON_QUALITY_ICU_TOOLS_ROOT}/bin64/genccode.exe" -o --skip-dll-export
      -e icudt79 -d "${icu_output}" "${JSON_QUALITY_ICU_ROOT}/source/data/in/icudt79l.dat"
    WORKING_DIRECTORY "${JSON_QUALITY_ICU_TOOLS_ROOT}/bin64"
    VERBATIM)
  add_custom_target(json_quality_icu DEPENDS "${icu_common}" "${icu_data}")
  set_source_files_properties("${icu_data}" PROPERTIES GENERATED TRUE EXTERNAL_OBJECT TRUE)
else()
  if(NOT CMAKE_SYSTEM_NAME STREQUAL "Linux" OR NOT CMAKE_SYSTEM_PROCESSOR MATCHES "^(x86_64|AMD64)$")
    message(FATAL_ERROR "Native platform artifacts support Windows x64 and glibc Linux x64 only")
  endif()
  include(ExternalProject)
  find_program(JSON_QUALITY_MAKE NAMES gmake make REQUIRED)
  ExternalProject_Add(json_quality_icu
    SOURCE_DIR "${JSON_QUALITY_ICU_ROOT}"
    BINARY_DIR "${icu_output}"
    DOWNLOAD_COMMAND ""
    CONFIGURE_COMMAND "${CMAKE_COMMAND}" -E env
      "CC=${CMAKE_C_COMPILER}" "CXX=${CMAKE_CXX_COMPILER}"
      "CFLAGS=-fPIC" "CXXFLAGS=-fPIC"
      "${JSON_QUALITY_ICU_ROOT}/source/runConfigureICU" Linux
      --disable-shared --enable-static --with-data-packaging=static
      --disable-tests --disable-samples
    BUILD_COMMAND "${JSON_QUALITY_MAKE}" -j2
    INSTALL_COMMAND ""
    BUILD_BYPRODUCTS "${icu_output}/lib/libicuuc.a" "${icu_output}/lib/libicudata.a")
  set(icu_common "${icu_output}/lib/libicuuc.a")
  set(icu_data "${icu_output}/lib/libicudata.a")
  find_package(Threads REQUIRED)
endif()

add_executable(json_quality_native bindings/framed_stdio.cpp)
set_target_properties(json_quality_native PROPERTIES OUTPUT_NAME json-quality-native)
add_library(json_quality_node MODULE bindings/node_api.cpp)
set_target_properties(json_quality_node PROPERTIES PREFIX "" SUFFIX ".node" OUTPUT_NAME json-quality)
target_compile_definitions(json_quality_node PRIVATE NAPI_VERSION=9
  NODE_GYP_MODULE_NAME=json_quality BUILDING_NODE_EXTENSION)
target_include_directories(json_quality_node SYSTEM PRIVATE "${JSON_QUALITY_NODE_HEADERS_ROOT}/include/node")

foreach(target json_quality_native json_quality_node)
  add_dependencies(${target} json_quality_icu)
  target_compile_definitions(${target} PRIVATE U_STATIC_IMPLEMENTATION BOOST_JSON_NO_LIB
    BOOST_CONTAINER_NO_LIB NOMINMAX
    JSON_QUALITY_SOURCE_INPUTS_SHA256="${JSON_QUALITY_SOURCE_INPUTS_SHA256}")
  target_include_directories(${target} SYSTEM PRIVATE "${JSON_QUALITY_BOOST_ROOT}"
    "${JSON_QUALITY_SQLITE_ROOT}" "${JSON_QUALITY_ICU_ROOT}/source/common")
  target_include_directories(${target} PRIVATE "${JSON_QUALITY_GENERATED_ROOT}")
  target_link_libraries(${target} PRIVATE json_quality_sqlite json_quality_double_conversion "${icu_common}")
  if(WIN32)
    target_sources(${target} PRIVATE "${icu_data}")
    target_link_libraries(${target} PRIVATE Bcrypt Advapi32 User32)
    target_compile_options(${target} PRIVATE /utf-8 /W4 /WX /external:W0)
    target_link_options(${target} PRIVATE /Brepro)
  else()
    target_link_libraries(${target} PRIVATE "${icu_data}" Threads::Threads ${CMAKE_DL_LIBS} m)
    target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
  endif()
endforeach()
if(WIN32)
  target_link_libraries(json_quality_node PRIVATE "${JSON_QUALITY_NODE_IMPORT_LIBRARY}")
else()
  # Keep bundled SQLite/ICU state independent from Node's own native components.
  target_link_options(json_quality_node PRIVATE "LINKER:--exclude-libs,ALL" "LINKER:-Bsymbolic")
endif()

install(TARGETS json_quality_native json_quality_node RUNTIME DESTINATION . LIBRARY DESTINATION .)

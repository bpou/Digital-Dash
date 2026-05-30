cmake_minimum_required(VERSION 3.21)

project(DigitalDashQt VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.4 REQUIRED COMPONENTS Quick WebSockets)

qt_standard_project_setup(REQUIRES 6.4)

qt_add_executable(digital-dash-qt
    src/main.cpp
    src/VehicleClient.cpp
    src/VehicleClient.h
)

target_link_libraries(digital-dash-qt
    PRIVATE
        Qt6::Quick
        Qt6::WebSockets
)

install(TARGETS digital-dash-qt
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)

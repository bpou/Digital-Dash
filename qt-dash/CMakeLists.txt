cmake_minimum_required(VERSION 3.21)

project(DigitalDashQt VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.4 REQUIRED COMPONENTS Quick WebSockets WebEngineQuick)

qt_standard_project_setup(REQUIRES 6.4)

qt_add_executable(digital-dash-qt
    src/main.cpp
    src/VehicleClient.cpp
    src/VehicleClient.h
)

qt_add_qml_module(digital-dash-qt
    URI DigitalDash
    VERSION 1.0
    QML_FILES
        qml/Main.qml
        qml/ClusterView.qml
        qml/CenterView.qml
        qml/Gauge.qml
        qml/MetricRow.qml
        qml/StatusPill.qml
)

target_link_libraries(digital-dash-qt
    PRIVATE
        Qt6::Quick
        Qt6::WebSockets
        Qt6::WebEngineQuick
)

install(TARGETS digital-dash-qt
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)

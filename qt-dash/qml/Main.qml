import QtQuick
import QtQuick.Window

Window {
    id: root
    width: 1280
    height: 480
    visible: true
    visibility: Window.FullScreen
    title: "Digital Dash Qt"
    color: "#020405"
    flags: Qt.Window | Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint

    property var state: vehicleClient.state
    property string currentView: initialView
    readonly property real logicalWidth: currentView === "center" ? 1280 : 1920
    readonly property real logicalHeight: currentView === "center" ? 640 : 720
    readonly property real viewScale: Math.min(width / logicalWidth, height / logicalHeight)

    Rectangle {
        anchors.fill: parent
        color: "#000000"
    }

    Item {
        id: viewFrame
        width: root.logicalWidth
        height: root.logicalHeight
        anchors.centerIn: parent
        scale: root.viewScale
        transformOrigin: Item.Center
        clip: true

        Loader {
            id: viewLoader
            anchors.fill: parent
            asynchronous: false
            sourceComponent: root.currentView === "center" ? centerComponent : clusterComponent
        }
    }

    Component.onCompleted: {
        root.raise();
        root.requestActivate();
    }

    Component {
        id: clusterComponent

        ClusterView {
            state: root.state
            onRequestView: function(viewName) {
                root.currentView = viewName
            }
        }
    }

    Component {
        id: centerComponent

        CenterView {
            state: root.state
            onRequestView: function(viewName) {
                root.currentView = viewName
            }
        }
    }
}

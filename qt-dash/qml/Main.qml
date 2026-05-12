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
    flags: Qt.Window | Qt.FramelessWindowHint

    property var state: vehicleClient.state

    Loader {
        anchors.fill: parent
        sourceComponent: initialView === "center" ? centerComponent : clusterComponent
    }

    Component {
        id: clusterComponent

        ClusterView {
            state: root.state
        }
    }

    Component {
        id: centerComponent

        CenterView {
            state: root.state
        }
    }
}

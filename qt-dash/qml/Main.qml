import QtQuick
import QtQuick.Window

Window {
    id: root
    width: 1280
    height: currentView === "center" ? 640 : 480
    visible: true
    visibility: Window.FullScreen
    title: "Digital Dash Qt"
    color: "#020405"
    flags: Qt.Window | Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint

    property var state: vehicleClient.state
    property string currentView: initialView

    Loader {
        anchors.fill: parent
        sourceComponent: root.currentView === "center" ? centerComponent : clusterComponent
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

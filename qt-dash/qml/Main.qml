import QtQuick
import QtQuick.Window
import QtQuick.Controls

ApplicationWindow {
    id: root
    width: 1920
    height: 720
    visible: true
    visibility: Window.FullScreen
    color: "#000000"
    title: "Digital Dash"

    property string activeView: initialView || "cluster"
    property var vehicleState: vehicleClient.state

    Shortcut {
        sequence: "Esc"
        onActivated: Qt.quit()
    }

    Rectangle {
        anchors.fill: parent
        color: "#07090c"

        ClusterView {
            anchors.fill: parent
            state: root.vehicleState
            visible: root.activeView === "cluster"
        }

        CenterView {
            anchors.fill: parent
            state: root.vehicleState
            visible: root.activeView === "center"
        }

        Row {
            anchors.top: parent.top
            anchors.right: parent.right
            anchors.margins: 18
            spacing: 8

            Button {
                text: "Cluster"
                onClicked: root.activeView = "cluster"
            }

            Button {
                text: "Center"
                onClicked: root.activeView = "center"
            }
        }
    }
}

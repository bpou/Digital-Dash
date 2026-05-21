import QtQuick

Item {
    id: root

    signal requestView(string viewName)

    implicitWidth: 1280
    implicitHeight: 640

    property var state
    property var safeState: state || ({})
    property var climate: safeState.climate || ({})
    property var audio: safeState.audio || ({})
    property var nowPlaying: audio.nowPlaying || ({})
    property var car: safeState.car || ({})
    property var ambient: safeState.ambient || ({})

    Rectangle {
        anchors.fill: parent
        color: "#050608"
    }

    Rectangle {
        id: clusterTestButton
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.rightMargin: 34
        anchors.topMargin: 28
        width: 96
        height: 34
        radius: 9
        z: 10
        color: Qt.rgba(10 / 255, 15 / 255, 18 / 255, 0.86)
        border.color: Qt.rgba(126 / 255, 227 / 255, 255 / 255, 0.32)
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: "CLUSTER"
            color: "#dff5ff"
            font.family: "sans-serif"
            font.pixelSize: 10
            font.weight: Font.Bold
            font.letterSpacing: 1.2
        }

        MouseArea {
            anchors.fill: parent
            onClicked: root.requestView("cluster")
        }
    }

    Row {
        anchors.fill: parent
        anchors.margins: 42
        spacing: 18

        Rectangle {
            width: parent.width * 0.44
            height: parent.height
            radius: 8
            color: "#0d1014"
            border.color: "#202832"
            border.width: 1

            Column {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 18

                Text {
                    text: "MEDIA"
                    color: "#7b8591"
                    font.family: "sans-serif"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                Text {
                    width: parent.width
                    elide: Text.ElideRight
                    text: root.nowPlaying.title || "No track"
                    color: "#f4f7fb"
                    font.family: "sans-serif"
                    font.pixelSize: 34
                    font.weight: Font.Medium
                }

                Text {
                    width: parent.width
                    elide: Text.ElideRight
                    text: root.nowPlaying.artist || ""
                    color: "#8b96a2"
                    font.family: "sans-serif"
                    font.pixelSize: 20
                }

                Rectangle {
                    width: parent.width
                    height: 5
                    radius: 3
                    color: "#202832"

                    Rectangle {
                        height: parent.height
                        radius: 3
                        color: "#f4f7fb"
                        width: parent.width * Math.min(1, (root.nowPlaying.positionSec || 0) / Math.max(1, root.nowPlaying.durationSec || 1))
                    }
                }
            }
        }

        Rectangle {
            width: parent.width * 0.27
            height: parent.height
            radius: 8
            color: "#0d1014"
            border.color: "#202832"
            border.width: 1

            Column {
                anchors.centerIn: parent
                spacing: 12

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: "CLIMATE"
                    color: "#7b8591"
                    font.family: "sans-serif"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: Math.round(root.climate.tempSetC || 0).toString()
                    color: "#f4f7fb"
                    font.family: "sans-serif"
                    font.pixelSize: 96
                    font.weight: Font.Light
                }

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: "C  Fan " + (root.climate.fan || 0)
                    color: "#8b96a2"
                    font.family: "sans-serif"
                    font.pixelSize: 18
                }
            }
        }

        Rectangle {
            width: parent.width * 0.26
            height: parent.height
            radius: 8
            color: "#0d1014"
            border.color: "#202832"
            border.width: 1

            Column {
                anchors.centerIn: parent
                spacing: 10

                Text {
                    text: "VEHICLE"
                    color: "#7b8591"
                    font.family: "sans-serif"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                MetricRow {
                    label: "Lock"
                    value: root.car.locked ? "LOCKED" : "OPEN"
                }

                MetricRow {
                    label: "Lights"
                    value: root.car.lights ? "ON" : "OFF"
                }

                MetricRow {
                    label: "Ambient"
                    value: Math.round(root.ambient.brightness || 0).toString()
                    suffix: "%"
                }
            }
        }
    }
}

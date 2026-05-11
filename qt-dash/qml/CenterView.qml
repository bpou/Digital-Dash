import QtQuick

Item {
    id: root
    property var state
    property var climate: state.climate || ({})
    property var audio: state.audio || ({})
    property var nowPlaying: audio.nowPlaying || ({})

    Rectangle {
        anchors.fill: parent
        color: "#080b0e"
    }

    Row {
        anchors.fill: parent
        anchors.margins: 52
        spacing: 28

        Rectangle {
            width: parent.width * 0.42
            height: parent.height
            radius: 18
            color: "#10151b"
            border.color: "#26313b"

            Column {
                anchors.fill: parent
                anchors.margins: 34
                spacing: 22

                Text {
                    text: "Media"
                    color: "white"
                    font.pixelSize: 34
                    font.bold: true
                }

                Text {
                    width: parent.width
                    elide: Text.ElideRight
                    text: root.nowPlaying.title || "No track"
                    color: "white"
                    font.pixelSize: 30
                    font.bold: true
                }

                Text {
                    width: parent.width
                    elide: Text.ElideRight
                    text: root.nowPlaying.artist || ""
                    color: "#98a7b3"
                    font.pixelSize: 22
                }

                Rectangle {
                    width: parent.width
                    height: 8
                    radius: 4
                    color: "#27333e"

                    Rectangle {
                        height: parent.height
                        radius: 4
                        color: "#6ee7f9"
                        width: parent.width * Math.min(1, (root.nowPlaying.positionSec || 0) / Math.max(1, root.nowPlaying.durationSec || 1))
                    }
                }
            }
        }

        Rectangle {
            width: parent.width * 0.28
            height: parent.height
            radius: 18
            color: "#10151b"
            border.color: "#26313b"

            Column {
                anchors.centerIn: parent
                spacing: 18

                Text {
                    text: "Climate"
                    color: "#98a7b3"
                    font.pixelSize: 24
                }

                Text {
                    text: Math.round(root.climate.tempSetC || 0) + "°C"
                    color: "white"
                    font.pixelSize: 82
                    font.bold: true
                }

                Text {
                    text: "Fan " + (root.climate.fan || 0)
                    color: "#d9e2ea"
                    font.pixelSize: 26
                }
            }
        }

        Rectangle {
            width: parent.width * 0.26
            height: parent.height
            radius: 18
            color: "#10151b"
            border.color: "#26313b"

            Column {
                anchors.centerIn: parent
                spacing: 18

                Text {
                    text: "Car"
                    color: "#98a7b3"
                    font.pixelSize: 24
                }

                StatusPill {
                    label: "LOCK"
                    value: state.car && state.car.locked ? "LOCKED" : "OPEN"
                }

                StatusPill {
                    label: "LIGHTS"
                    value: state.car && state.car.lights ? "ON" : "OFF"
                }

                StatusPill {
                    label: "HAZARD"
                    value: state.car && state.car.hazards ? "ON" : "OFF"
                }
            }
        }
    }
}

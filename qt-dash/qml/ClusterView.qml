import QtQuick

Item {
    id: root
    property var state

    property real rpm: state.engine ? state.engine.rpm || 0 : 0
    property real speed: state.vehicle ? state.vehicle.speedKmh || 0 : 0
    property real fuel: state.fuel ? state.fuel.percent || 0 : 0
    property real battery: state.electrical ? state.electrical.batteryV || 0 : 0
    property var nowPlaying: state.audio && state.audio.nowPlaying ? state.audio.nowPlaying : ({})

    Rectangle {
        anchors.fill: parent
        color: "#06080a"

        Rectangle {
            anchors.fill: parent
            opacity: 0.34
            gradient: Gradient {
                GradientStop { position: 0.0; color: "#102230" }
                GradientStop { position: 0.55; color: "#07090c" }
                GradientStop { position: 1.0; color: "#030405" }
            }
        }
    }

    Row {
        anchors.centerIn: parent
        spacing: 88

        Gauge {
            width: 520
            height: 520
            value: root.rpm
            maximumValue: 8000
            label: "RPM"
            valueText: Math.round(root.rpm).toString()
            accentColor: "#0080ff"
        }

        Column {
            width: 560
            height: 520
            spacing: 28

            Item { width: 1; height: 26 }

            Text {
                anchors.horizontalCenter: parent.horizontalCenter
                text: Math.round(root.fuel) + "% FUEL"
                color: "white"
                font.pixelSize: 34
                font.bold: true
            }

            Row {
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: 14

                StatusPill {
                    label: "BATTERY"
                    value: root.battery.toFixed(1) + "V"
                }

                StatusPill {
                    label: vehicleClient.connected ? "LIVE" : "MOCK"
                    value: vehicleClient.connected ? "WS" : "LOCAL"
                }
            }

            Rectangle {
                width: 520
                height: 128
                radius: 20
                color: "#101820"
                border.color: "#263542"
                border.width: 1

                Column {
                    anchors.centerIn: parent
                    spacing: 8

                    Text {
                        width: 480
                        horizontalAlignment: Text.AlignHCenter
                        elide: Text.ElideRight
                        text: root.nowPlaying.title || "No track"
                        color: "white"
                        font.pixelSize: 28
                        font.bold: true
                    }

                    Text {
                        width: 480
                        horizontalAlignment: Text.AlignHCenter
                        elide: Text.ElideRight
                        text: root.nowPlaying.artist || ""
                        color: "#93a4b2"
                        font.pixelSize: 18
                    }
                }
            }
        }

        Gauge {
            width: 520
            height: 520
            value: root.speed
            maximumValue: 200
            label: "km/h"
            valueText: Math.round(root.speed).toString()
            accentColor: "#00d1ff"
        }
    }
}

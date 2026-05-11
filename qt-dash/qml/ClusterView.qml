import QtQuick

Item {
    id: root

    property var state
    property var safeState: state || ({})
    property var engine: safeState.engine || ({})
    property var vehicle: safeState.vehicle || ({})
    property var fuelState: safeState.fuel || ({})
    property var temp: safeState.temp || ({})
    property var electrical: safeState.electrical || ({})
    property var audio: safeState.audio || ({})
    property var nowPlaying: audio.nowPlaying || ({})
    property var turn: safeState.turn || ({})
    property var car: safeState.car || ({})

    property real rpm: engine.rpm || 0
    property real speed: vehicle.speedKmh || 0
    property real fuel: fuelState.percent || 0
    property real battery: electrical.batteryV || 0
    property string gear: speed > 1 ? "D" : "P"
    property date clockTime: new Date()

    property color bg0: "#030507"
    property color bg1: "#080d12"
    property color panel: "#0d131a"
    property color panel2: "#111922"
    property color border: "#202b36"
    property color textMain: "#f4f7fb"
    property color textSoft: "#9aa6b2"
    property color textDim: "#65717d"
    property color accent: "#dfe7ef"
    property color blue: "#8ebcff"
    property color warning: "#ff7575"

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: root.clockTime = new Date()
    }

    Rectangle {
        anchors.fill: parent
        color: root.bg0

        Rectangle {
            anchors.fill: parent
            gradient: Gradient {
                GradientStop { position: 0.00; color: "#111923" }
                GradientStop { position: 0.42; color: "#070a0e" }
                GradientStop { position: 1.00; color: "#010203" }
            }
        }

        Rectangle {
            anchors.fill: parent
            opacity: 0.13
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0.00; color: "#1d2b3a" }
                GradientStop { position: 0.50; color: "transparent" }
                GradientStop { position: 1.00; color: "#1d2b3a" }
            }
        }
    }

    Rectangle {
        id: shell
        anchors.fill: parent
        anchors.margins: 24
        radius: 34
        color: "#070b10"
        border.color: "#16202a"
        border.width: 1
    }

    Rectangle {
        id: softCenterGlow
        anchors.centerIn: parent
        width: 680
        height: 420
        radius: 240
        color: "#101923"
        opacity: 0.62
    }

    Row {
        id: topBar
        anchors.top: shell.top
        anchors.left: shell.left
        anchors.right: shell.right
        anchors.topMargin: 22
        anchors.leftMargin: 28
        anchors.rightMargin: 28
        height: 44
        spacing: 12

        StatusPill {
            label: vehicleClient.connected ? "ONLINE" : "LOCAL"
            value: vehicleClient.connected ? "CAN" : "SIM"
            accentColor: vehicleClient.connected ? root.blue : root.textDim
        }

        StatusPill {
            label: "GEAR"
            value: root.gear
            accentColor: root.textMain
        }

        StatusPill {
            label: "LEFT"
            value: root.turn.left ? "ON" : "OFF"
            accentColor: root.turn.left ? root.blue : root.textDim
        }

        StatusPill {
            label: "RIGHT"
            value: root.turn.right ? "ON" : "OFF"
            accentColor: root.turn.right ? root.blue : root.textDim
        }
    }

    Text {
        anchors.top: shell.top
        anchors.right: shell.right
        anchors.topMargin: 31
        anchors.rightMargin: 34
        text: Qt.formatTime(root.clockTime, "HH:mm")
        color: root.textSoft
        font.family: "Inter"
        font.pixelSize: 22
        font.weight: Font.Medium
    }

    Column {
        id: centerStack
        anchors.centerIn: parent
        width: 640
        spacing: 0

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: root.gear === "D" ? "DRIVE" : "READY"
            color: root.textSoft
            font.family: "Inter"
            font.pixelSize: 17
            font.letterSpacing: 4
            font.weight: Font.DemiBold
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: Math.round(root.speed).toString()
            color: root.textMain
            font.family: "Inter"
            font.pixelSize: 196
            font.weight: Font.ExtraLight
            lineHeight: 0.82
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "km/h"
            color: root.textSoft
            font.family: "Inter"
            font.pixelSize: 24
            font.weight: Font.Medium
        }

        Rectangle {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 455
            height: 1
            color: root.border
            opacity: 0.95
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 520
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            text: root.nowPlaying.title
                  ? root.nowPlaying.title + "  —  " + (root.nowPlaying.artist || "")
                  : "No media playing"
            color: "#d4dbe4"
            font.family: "Inter"
            font.pixelSize: 19
            font.weight: Font.Medium
        }
    }

    Rectangle {
        id: leftCard
        anchors.left: shell.left
        anchors.leftMargin: 36
        anchors.verticalCenter: parent.verticalCenter
        width: 322
        height: 410
        radius: 26
        color: root.panel
        border.color: root.border
        border.width: 1

        Column {
            anchors.fill: parent
            anchors.margins: 22
            spacing: 14

            Text {
                text: "POWERTRAIN"
                color: root.textDim
                font.family: "Inter"
                font.pixelSize: 13
                font.letterSpacing: 2
                font.weight: Font.DemiBold
            }

            Gauge {
                width: 278
                height: 214
                value: root.rpm
                maximumValue: 8000
                label: "RPM"
                valueText: Math.round(root.rpm).toString()
                accentColor: root.accent
            }

            MetricRow {
                label: "Fuel"
                value: Math.round(root.fuel).toString()
                suffix: "%"
            }

            MetricRow {
                label: "Battery"
                value: root.battery.toFixed(1)
                suffix: "V"
            }

            MetricRow {
                label: "Locked"
                value: root.car.locked ? "YES" : "NO"
            }
        }
    }

    Rectangle {
        id: rightCard
        anchors.right: shell.right
        anchors.rightMargin: 36
        anchors.verticalCenter: parent.verticalCenter
        width: 322
        height: 410
        radius: 26
        color: root.panel
        border.color: root.border
        border.width: 1

        Column {
            anchors.fill: parent
            anchors.margins: 22
            spacing: 16

            Text {
                text: "VEHICLE"
                color: root.textDim
                font.family: "Inter"
                font.pixelSize: 13
                font.letterSpacing: 2
                font.weight: Font.DemiBold
            }

            MetricRow {
                label: "Oil temp"
                value: Math.round(root.temp.oilC || 0).toString()
                suffix: "°C"
            }

            MetricRow {
                label: "Coolant"
                value: Math.round(root.temp.coolantC || 0).toString()
                suffix: "°C"
            }

            MetricRow {
                label: "Lights"
                value: root.car.lights ? "ON" : "OFF"
            }

            MetricRow {
                label: "Hazards"
                value: root.car.hazards ? "ON" : "OFF"
                accentColor: root.car.hazards ? root.warning : root.textMain
            }

            Rectangle {
                width: parent.width
                height: 1
                color: root.border
                opacity: 0.9
            }

            Row {
                width: parent.width
                spacing: 10

                Rectangle {
                    width: 10
                    height: 10
                    radius: 5
                    anchors.verticalCenter: parent.verticalCenter
                    color: vehicleClient.connected ? root.blue : root.textDim
                }

                Text {
                    text: vehicleClient.connected ? "Vehicle data online" : "Mock data active"
                    color: root.textSoft
                    font.family: "Inter"
                    font.pixelSize: 16
                    font.weight: Font.Medium
                }
            }
        }
    }

    Rectangle {
        id: bottomInfo
        anchors.bottom: shell.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: 22
        width: 570
        height: 46
        radius: 23
        color: root.panel2
        border.color: root.border
        border.width: 1

        Row {
            anchors.centerIn: parent
            spacing: 34

            Text {
                text: "Range  " + Math.round(root.fuel * 4.2) + " km"
                color: root.textSoft
                font.family: "Inter"
                font.pixelSize: 16
                font.weight: Font.Medium
            }

            Rectangle {
                width: 1
                height: 18
                color: "#2b3744"
            }

            Text {
                text: "Battery  " + root.battery.toFixed(1) + " V"
                color: root.textSoft
                font.family: "Inter"
                font.pixelSize: 16
                font.weight: Font.Medium
            }

            Rectangle {
                width: 1
                height: 18
                color: "#2b3744"
            }

            Text {
                text: vehicleClient.connected ? "CAN online" : "CAN mock"
                color: vehicleClient.connected ? root.blue : root.textSoft
                font.family: "Inter"
                font.pixelSize: 16
                font.weight: Font.Medium
            }
        }
    }
}
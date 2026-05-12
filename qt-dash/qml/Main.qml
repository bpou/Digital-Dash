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

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: root.clockTime = new Date()
    }

    Rectangle {
        anchors.fill: parent
        color: "#07090d"

        Rectangle {
            anchors.fill: parent
            gradient: Gradient {
                GradientStop { position: 0.0; color: "#111821" }
                GradientStop { position: 0.45; color: "#07090d" }
                GradientStop { position: 1.0; color: "#020304" }
            }
        }

        Rectangle {
            anchors.fill: parent
            opacity: 0.18
            gradient: Gradient {
                GradientStop { position: 0.0; color: "#263342" }
                GradientStop { position: 0.55; color: "transparent" }
                GradientStop { position: 1.0; color: "transparent" }
            }
        }
    }

    Rectangle {
        id: mainPanel
        anchors.fill: parent
        anchors.margins: 26
        radius: 34
        color: "#0b1016"
        border.color: "#1b2530"
        border.width: 1
        opacity: 0.96
    }

    Row {
        id: topStatus
        anchors.top: mainPanel.top
        anchors.left: mainPanel.left
        anchors.right: mainPanel.right
        anchors.margins: 24
        height: 46
        spacing: 12

        StatusPill {
            label: vehicleClient.connected ? "ONLINE" : "LOCAL"
            value: vehicleClient.connected ? "CAN" : "SIM"
            accentColor: vehicleClient.connected ? "#8db8ff" : "#808a96"
        }

        StatusPill {
            label: "GEAR"
            value: root.gear
            accentColor: "#f1f5f9"
        }

        StatusPill {
            label: "LEFT"
            value: root.turn.left ? "ON" : "OFF"
            accentColor: root.turn.left ? "#8db8ff" : "#6d7580"
        }

        StatusPill {
            label: "RIGHT"
            value: root.turn.right ? "ON" : "OFF"
            accentColor: root.turn.right ? "#8db8ff" : "#6d7580"
        }

        Item { width: 1; height: 1 }
    }

    Text {
        anchors.top: mainPanel.top
        anchors.right: mainPanel.right
        anchors.topMargin: 32
        anchors.rightMargin: 34
        text: Qt.formatTime(root.clockTime, "HH:mm")
        color: "#9aa6b2"
        font.family: "Inter"
        font.pixelSize: 22
        font.weight: Font.Medium
    }

    Column {
        id: centerStack
        anchors.centerIn: parent
        width: 620
        spacing: 2

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: root.gear === "D" ? "DRIVE" : "READY"
            color: "#8d99a6"
            font.family: "Inter"
            font.pixelSize: 18
            font.letterSpacing: 3
            font.weight: Font.DemiBold
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: Math.round(root.speed).toString()
            color: "#f8fafc"
            font.family: "Inter"
            font.pixelSize: 190
            font.weight: Font.ExtraLight
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "km/h"
            color: "#8f9ba8"
            font.family: "Inter"
            font.pixelSize: 24
            font.weight: Font.Medium
        }

        Rectangle {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 460
            height: 1
            color: "#25313d"
            opacity: 0.9
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 520
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            text: root.nowPlaying.title
                  ? root.nowPlaying.title + "  —  " + (root.nowPlaying.artist || "")
                  : "No media playing"
            color: "#cfd6df"
            font.family: "Inter"
            font.pixelSize: 19
            font.weight: Font.Medium
        }
    }

    Column {
        id: leftRail
        anchors.left: mainPanel.left
        anchors.leftMargin: 44
        anchors.verticalCenter: parent.verticalCenter
        width: 300
        spacing: 14

        Text {
            text: "POWERTRAIN"
            color: "#6f7a86"
            font.family: "Inter"
            font.pixelSize: 13
            font.letterSpacing: 2
            font.weight: Font.DemiBold
        }

        Gauge {
            width: 270
            height: 215
            value: root.rpm
            maximumValue: 8000
            label: "RPM"
            valueText: Math.round(root.rpm).toString()
            accentColor: "#e8eef5"
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

    Column {
        id: rightRail
        anchors.right: mainPanel.right
        anchors.rightMargin: 44
        anchors.verticalCenter: parent.verticalCenter
        width: 300
        spacing: 14

        Text {
            text: "VEHICLE"
            color: "#6f7a86"
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
            accentColor: root.car.hazards ? "#ff7474" : "#e8eef5"
        }
    }

    Rectangle {
        anchors.bottom: mainPanel.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: 24
        width: 560
        height: 44
        radius: 22
        color: "#0e141b"
        border.color: "#1d2834"
        border.width: 1

        Row {
            anchors.centerIn: parent
            spacing: 34

            Text {
                text: "Range  " + Math.round(root.fuel * 4.2) + " km"
                color: "#9aa6b2"
                font.family: "Inter"
                font.pixelSize: 16
                font.weight: Font.Medium
            }

            Rectangle {
                width: 1
                height: 18
                color: "#2a3542"
            }

            Text {
                text: "CAN  " + (vehicleClient.connected ? "online" : "mock")
                color: vehicleClient.connected ? "#a9c7ff" : "#9aa6b2"
                font.family: "Inter"
                font.pixelSize: 16
                font.weight: Font.Medium
            }
        }
    }
}

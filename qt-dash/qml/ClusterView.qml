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
        color: "#050608"

        Rectangle {
            anchors.fill: parent
            opacity: 0.55
            gradient: Gradient {
                GradientStop { position: 0.0; color: "#0b0e12" }
                GradientStop { position: 0.48; color: "#050608" }
                GradientStop { position: 1.0; color: "#020304" }
            }
        }

        Rectangle {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top
            width: 1
            height: parent.height
            color: "#1b222a"
            opacity: 0.55
        }
    }

    Row {
        id: topStatus
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: 28
        height: 42
        spacing: 12

        StatusPill {
            label: vehicleClient.connected ? "LIVE" : "LOCAL"
            value: vehicleClient.connected ? "WS" : "MOCK"
            accentColor: vehicleClient.connected ? "#8fb4ff" : "#d7dde5"
        }

        StatusPill {
            label: "GEAR"
            value: root.gear
            accentColor: "#f3f7fb"
        }

        StatusPill {
            label: "LEFT"
            value: root.turn.left ? "ON" : "OFF"
            accentColor: root.turn.left ? "#6fb2ff" : "#6b7480"
        }

        StatusPill {
            label: "RIGHT"
            value: root.turn.right ? "ON" : "OFF"
            accentColor: root.turn.right ? "#6fb2ff" : "#6b7480"
        }

    }

    Text {
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.topMargin: 30
        anchors.rightMargin: 34
        text: Qt.formatTime(root.clockTime, "HH:mm")
        color: "#7f8994"
        font.family: "Inter"
        font.pixelSize: 20
        font.weight: Font.Medium
    }

    Column {
        id: leftRail
        anchors.left: parent.left
        anchors.leftMargin: 54
        anchors.verticalCenter: parent.verticalCenter
        width: 300
        spacing: 10

        Text {
            text: "POWERTRAIN"
            color: "#747f8a"
            font.family: "Inter"
            font.pixelSize: 13
            font.weight: Font.DemiBold
        }

        Gauge {
            width: 260
            height: 210
            value: root.rpm
            maximumValue: 8000
            label: "RPM"
            valueText: Math.round(root.rpm).toString()
            accentColor: "#f4f7fb"
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
        id: centerStack
        anchors.centerIn: parent
        width: 560
        spacing: 4

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: root.gear === "D" ? "DRIVE" : "READY"
            color: "#9aa4af"
            font.family: "Inter"
            font.pixelSize: 18
            font.weight: Font.DemiBold
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: Math.round(root.speed).toString()
            color: "#f8fafc"
            font.family: "Inter"
            font.pixelSize: 184
            font.weight: Font.Light
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "km/h"
            color: "#8b96a2"
            font.family: "Inter"
            font.pixelSize: 24
            font.weight: Font.Medium
        }

        Rectangle {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 420
            height: 1
            color: "#26303a"
            opacity: 0.8
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 500
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            text: root.nowPlaying.title ? root.nowPlaying.title + " - " + (root.nowPlaying.artist || "") : "No media"
            color: "#d8dee7"
            font.family: "Inter"
            font.pixelSize: 20
            font.weight: Font.Medium
        }
    }

    Column {
        id: rightRail
        anchors.right: parent.right
        anchors.rightMargin: 54
        anchors.verticalCenter: parent.verticalCenter
        width: 300
        spacing: 10

        Text {
            text: "THERMAL"
            color: "#747f8a"
            font.family: "Inter"
            font.pixelSize: 13
            font.weight: Font.DemiBold
        }

        MetricRow {
            label: "Oil"
            value: Math.round(root.temp.oilC || 0).toString()
            suffix: "C"
        }

        MetricRow {
            label: "Coolant"
            value: Math.round(root.temp.coolantC || 0).toString()
            suffix: "C"
        }

        MetricRow {
            label: "Lights"
            value: root.car.lights ? "ON" : "OFF"
        }

        MetricRow {
            label: "Hazards"
            value: root.car.hazards ? "ON" : "OFF"
            accentColor: root.car.hazards ? "#ff6b6b" : "#f4f7fb"
        }
    }

    Row {
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: 26
        spacing: 34

        Text {
            text: "Range " + Math.round(root.fuel * 4.2) + " km"
            color: "#8b96a2"
            font.family: "Inter"
            font.pixelSize: 17
        }

        Text {
            text: "CAN " + (vehicleClient.connected ? "online" : "mock")
            color: "#8b96a2"
            font.family: "Inter"
            font.pixelSize: 17
        }
    }
}

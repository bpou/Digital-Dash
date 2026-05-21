import QtQuick
import QtQuick.Effects

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
    property var temp: safeState.temp || ({})
    property var fuelState: safeState.fuel || ({})
    property var electrical: safeState.electrical || ({})
    property date clockTime: new Date()
    property color ambientColor: ambient.color || "#7ee3ff"
    property real ambientStrength: Math.max(0.18, Math.min(1, (ambient.brightness || 65) / 100))
    property real mediaProgress: Math.min(1, (nowPlaying.positionSec || 0) / Math.max(1, nowPlaying.durationSec || 1))
    property bool launcherOpen: false
    property string activePage: "MEDIA"
    property string dialNumber: ""
    property string contactSearch: ""

    function postBluetooth(path) {
        var request = new XMLHttpRequest();
        request.open("POST", "http://127.0.0.1:5175" + path);
        request.send();
    }

    function sendClimate(next) {
        vehicleClient.sendCommand("climate/set", next);
    }

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: root.clockTime = new Date()
    }

    Rectangle {
        anchors.fill: parent
        color: "#050608"
    }

    Canvas {
        id: ambientCanvas
        anchors.fill: parent
        opacity: root.ambientStrength

        onPaint: {
            var ctx = getContext("2d");
            ctx.reset();

            var g = ctx.createRadialGradient(width * 0.18, height * 0.15, 0, width * 0.18, height * 0.15, width * 0.55);
            g.addColorStop(0.0, "rgba(" + Math.round(root.ambientColor.r * 255) + "," + Math.round(root.ambientColor.g * 255) + "," + Math.round(root.ambientColor.b * 255) + ",0.22)");
            g.addColorStop(1.0, "rgba(" + Math.round(root.ambientColor.r * 255) + "," + Math.round(root.ambientColor.g * 255) + "," + Math.round(root.ambientColor.b * 255) + ",0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);

            g = ctx.createRadialGradient(width * 0.82, height * 0.34, 0, width * 0.82, height * 0.34, width * 0.60);
            g.addColorStop(0.0, "rgba(" + Math.round(root.ambientColor.r * 255) + "," + Math.round(root.ambientColor.g * 255) + "," + Math.round(root.ambientColor.b * 255) + ",0.18)");
            g.addColorStop(1.0, "rgba(" + Math.round(root.ambientColor.r * 255) + "," + Math.round(root.ambientColor.g * 255) + "," + Math.round(root.ambientColor.b * 255) + ",0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }

        Connections {
            target: root
            function onAmbientColorChanged() { ambientCanvas.requestPaint(); }
            function onAmbientStrengthChanged() { ambientCanvas.requestPaint(); }
            function onWidthChanged() { ambientCanvas.requestPaint(); }
            function onHeightChanged() { ambientCanvas.requestPaint(); }
        }

        Component.onCompleted: requestPaint()
    }

    Row {
        id: statusBar
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        height: 34
        anchors.leftMargin: 18
        anchors.rightMargin: 18

        Text {
            anchors.verticalCenter: parent.verticalCenter
            width: 220
            text: Qt.formatTime(root.clockTime, "HH:mm")
            color: "#f4f7fb"
            font.family: "sans-serif"
            font.pixelSize: 13
            font.weight: Font.DemiBold
        }

        Text {
            anchors.verticalCenter: parent.verticalCenter
            width: parent.width - 440
            horizontalAlignment: Text.AlignHCenter
            text: "DIGITAL DASH"
            color: "#6f7c86"
            font.family: "sans-serif"
            font.pixelSize: 10
            font.weight: Font.Bold
            font.letterSpacing: 2
        }

        Row {
            width: 220
            anchors.verticalCenter: parent.verticalCenter
            spacing: 14
            layoutDirection: Qt.RightToLeft

            Text {
                text: Math.round(root.temp.coolantC || 0) + "C"
                color: "#8b96a2"
                font.family: "sans-serif"
                font.pixelSize: 12
                font.weight: Font.DemiBold
            }

            Text {
                text: "BT"
                color: "#8b96a2"
                font.family: "sans-serif"
                font.pixelSize: 12
                font.weight: Font.DemiBold
            }

            Text {
                text: "LTE"
                color: "#8b96a2"
                font.family: "sans-serif"
                font.pixelSize: 12
                font.weight: Font.DemiBold
            }
        }
    }

    Rectangle {
        id: clusterTestButton
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.rightMargin: 34
        anchors.topMargin: 48
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

    Rectangle {
        id: mainPanel
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: statusBar.bottom
        anchors.bottom: quickBar.top
        anchors.margins: 26
        anchors.topMargin: 18
        anchors.bottomMargin: 20
        radius: 28
        color: Qt.rgba(1, 1, 1, 0.05)
        border.color: Qt.rgba(1, 1, 1, 0.10)
        border.width: 1
    }

    MultiEffect {
        anchors.fill: mainPanel
        source: mainPanel
        autoPaddingEnabled: true
        shadowEnabled: true
        shadowBlur: 0.8
        shadowScale: 1.01
        shadowOpacity: 0.26
        shadowColor: "#000000"
    }

    Row {
        id: contentRow
        anchors.fill: mainPanel
        anchors.margins: 24
        spacing: 22
        visible: root.activePage === "MEDIA"

        GlassPanel {
            id: mediaPanel
            width: parent.width * 0.48
            height: parent.height

            Row {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 22

                Rectangle {
                    id: mediaArtwork
                    width: Math.min(parent.height - 48, parent.width * 0.36)
                    height: width
                    radius: 14
                    color: "#12191c"
                    clip: true

                    Image {
                        anchors.fill: parent
                        source: root.nowPlaying.artworkUrl || "file:///home/admin/digital-dash/public/albumcover.jpg"
                        fillMode: Image.PreserveAspectCrop
                        smooth: true
                        mipmap: true
                    }
                }

                Column {
                    width: parent.width - parent.spacing - mediaArtwork.width
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 16

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
                        font.pixelSize: 38
                        font.weight: Font.Medium
                    }

                    Text {
                        width: parent.width
                        elide: Text.ElideRight
                        text: root.nowPlaying.artist || "Bluetooth audio"
                        color: "#8b96a2"
                        font.family: "sans-serif"
                        font.pixelSize: 20
                    }

                    ProgressBar {
                        width: parent.width
                        value: root.mediaProgress
                    }

                    Row {
                        spacing: 10
                        PillButton { label: "PREV"; width: 78; onClicked: vehicleClient.sendCommand("bt/media/control", { "action": "prev" }) }
                        PillButton { label: root.nowPlaying.isPlaying ? "PAUSE" : "PLAY"; width: 86; active: true; onClicked: vehicleClient.sendCommand("bt/media/control", { "action": root.nowPlaying.isPlaying ? "pause" : "play" }) }
                        PillButton { label: "NEXT"; width: 78; onClicked: vehicleClient.sendCommand("bt/media/control", { "action": "next" }) }
                    }

                    Row {
                        spacing: 10

                        PillButton {
                            label: "SPOTIFY"
                            width: 96
                            onClicked: Qt.openUrlExternally("https://open.spotify.com")
                        }

                        PillButton {
                            label: "YOUTUBE MUSIC"
                            width: 132
                            onClicked: Qt.openUrlExternally("https://music.youtube.com")
                        }

                        PillButton {
                            label: "PI YTM"
                            width: 78
                            onClicked: Qt.openUrlExternally("http://127.0.0.1:5174")
                        }
                    }
                }
            }
        }

        Column {
            id: middleColumn
            width: parent.width * 0.25
            height: parent.height
            spacing: 22

            GlassPanel {
                width: parent.width
                height: (parent.height - parent.spacing) * 0.58

                Column {
                    anchors.centerIn: parent
                    spacing: 10

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

            GlassPanel {
                width: parent.width
                height: (parent.height - parent.spacing) * 0.42

                Column {
                    anchors.centerIn: parent
                    spacing: 10

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "QUICK"
                        color: "#7b8591"
                        font.family: "sans-serif"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                    }

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: root.car.lights ? "LIGHTS ON" : "LIGHTS OFF"
                        color: "#f4f7fb"
                        font.family: "sans-serif"
                        font.pixelSize: 24
                        font.weight: Font.Medium
                    }

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: root.car.locked ? "LOCKED" : "UNLOCKED"
                        color: "#8b96a2"
                        font.family: "sans-serif"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                    }
                }
            }
        }

        GlassPanel {
            width: contentRow.width - mediaPanel.width - middleColumn.width - contentRow.spacing * 2
            height: parent.height

            Column {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 18

                Text {
                    text: "VEHICLE"
                    color: "#7b8591"
                    font.family: "sans-serif"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                InfoRow { label: "Battery"; value: Number(root.electrical.batteryV || 0).toFixed(1) + " V" }
                InfoRow { label: "Oil"; value: Math.round(root.temp.oilC || 0) + " C" }
                InfoRow { label: "Coolant"; value: Math.round(root.temp.coolantC || 0) + " C" }
                InfoRow { label: "Ambient"; value: Math.round(root.ambient.brightness || 0) + "%" }

                Rectangle {
                    width: parent.width
                    height: 118
                    radius: 18
                    color: Qt.rgba(1, 1, 1, 0.045)
                    border.color: Qt.rgba(1, 1, 1, 0.08)
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "NAV READY"
                        color: "#f4f7fb"
                        font.family: "sans-serif"
                        font.pixelSize: 22
                        font.weight: Font.Medium
                        font.letterSpacing: 2
                    }
                }
            }
        }
    }

    Item {
        anchors.fill: mainPanel
        anchors.margins: 24
        visible: root.activePage === "CLIMATE"

        Row {
            anchors.fill: parent
            spacing: 22

            GlassPanel {
                id: climateTempPanel
                width: parent.width * 0.44
                height: parent.height

                Column {
                    anchors.centerIn: parent
                    spacing: 18

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "CABIN TEMP"
                        color: "#7b8591"
                        font.family: "sans-serif"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                        font.letterSpacing: 2
                    }

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: Math.round(root.climate.tempSetC || 0) + " C"
                        color: "#f4f7fb"
                        font.family: "sans-serif"
                        font.pixelSize: 96
                        font.weight: Font.Light
                    }

                    Row {
                        anchors.horizontalCenter: parent.horizontalCenter
                        spacing: 16

                        RoundButton { label: "-"; onClicked: root.sendClimate({ "tempSetC": (root.climate.tempSetC || 0) - 1 }) }
                        RoundButton { label: "+"; onClicked: root.sendClimate({ "tempSetC": (root.climate.tempSetC || 0) + 1 }) }
                    }
                }
            }

            GlassPanel {
                id: climateFanPanel
                width: parent.width * 0.25
                height: parent.height

                Column {
                    anchors.centerIn: parent
                    spacing: 16

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "FAN"
                        color: "#7b8591"
                        font.family: "sans-serif"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                        font.letterSpacing: 2
                    }

                    Repeater {
                        model: 6
                        PillButton {
                            width: 168
                            label: "SPEED " + index
                            active: Math.round(root.climate.fan || 0) === index
                            onClicked: root.sendClimate({ "fan": index })
                        }
                    }
                }
            }

            GlassPanel {
                width: parent.width - parent.spacing * 2 - climateTempPanel.width - climateFanPanel.width
                height: parent.height

                Grid {
                    anchors.centerIn: parent
                    columns: 2
                    columnSpacing: 14
                    rowSpacing: 14

                    PillButton { width: 138; height: 64; label: "AC"; active: root.climate.ac; onClicked: root.sendClimate({ "ac": !root.climate.ac }) }
                    PillButton { width: 138; height: 64; label: "RECIRC"; active: root.climate.recirc; onClicked: root.sendClimate({ "recirc": !root.climate.recirc }) }
                    PillButton { width: 138; height: 64; label: "DEFROST"; active: root.climate.defrost; onClicked: root.sendClimate({ "defrost": !root.climate.defrost }) }
                    PillButton { width: 138; height: 64; label: "AUTO"; active: root.climate.auto; onClicked: root.sendClimate({ "auto": !root.climate.auto }) }
                }
            }
        }
    }

    Item {
        anchors.fill: mainPanel
        anchors.margins: 24
        visible: root.activePage === "CAR"

        Row {
            anchors.fill: parent
            spacing: 22

            GlassPanel {
                id: carControlsPanel
                width: parent.width * 0.48
                height: parent.height

                Grid {
                    anchors.centerIn: parent
                    columns: 2
                    columnSpacing: 16
                    rowSpacing: 16

                    PillButton { width: 178; height: 74; label: "HAZARDS"; active: root.car.hazards; activeColor: "#ff5b5b"; onClicked: vehicleClient.sendCommand("car/toggleHazards") }
                    PillButton { width: 178; height: 74; label: "LIGHTS"; active: root.car.lights; onClicked: vehicleClient.sendCommand("car/toggleLights") }
                    PillButton { width: 178; height: 74; label: root.car.locked ? "LOCKED" : "UNLOCKED"; active: root.car.locked; activeColor: "#7ee3ff"; onClicked: vehicleClient.sendCommand("car/toggleLock") }
                    PillButton { width: 178; height: 74; label: "AMBIENT"; active: true; activeColor: root.ambientColor; onClicked: vehicleClient.sendCommand("ambient/set", { "color": "#7EE3FF", "brightness": root.ambient.brightness || 65 }) }
                }
            }

            GlassPanel {
                width: parent.width - parent.spacing - carControlsPanel.width
                height: parent.height

                Column {
                    anchors.fill: parent
                    anchors.margins: 28
                    spacing: 14

                    Text { text: "VEHICLE STATUS"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.DemiBold; font.letterSpacing: 2 }
                    InfoRow { label: "Fuel"; value: Math.round(root.fuelState.percent || 0) + "%" }
                    InfoRow { label: "Battery"; value: Number(root.electrical.batteryV || 0).toFixed(1) + " V" }
                    InfoRow { label: "Oil"; value: Math.round(root.temp.oilC || 0) + " C" }
                    InfoRow { label: "Coolant"; value: Math.round(root.temp.coolantC || 0) + " C" }
                }
            }
        }
    }

    Item {
        anchors.fill: mainPanel
        anchors.margins: 24
        visible: root.activePage === "NAVIGATION"

        GlassPanel {
            anchors.fill: parent

            Column {
                anchors.fill: parent
                anchors.margins: 28
                spacing: 18

                Text { text: "NAVIGATION"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.DemiBold; font.letterSpacing: 2 }

                Rectangle {
                    width: parent.width
                    height: 232
                    radius: 20
                    color: Qt.rgba(1, 1, 1, 0.045)
                    border.color: Qt.rgba(1, 1, 1, 0.08)
                    border.width: 1

                    Canvas {
                        anchors.fill: parent
                        onPaint: {
                            var ctx = getContext("2d");
                            ctx.reset();
                            ctx.strokeStyle = "rgba(126,227,255,0.32)";
                            ctx.lineWidth = 2;
                            for (var x = 28; x < width; x += 48) {
                                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 80, height); ctx.stroke();
                            }
                            for (var y = 28; y < height; y += 48) {
                                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y + 40); ctx.stroke();
                            }
                            ctx.strokeStyle = "#7ee3ff";
                            ctx.lineWidth = 5;
                            ctx.beginPath();
                            ctx.moveTo(width * 0.18, height * 0.72);
                            ctx.bezierCurveTo(width * 0.34, height * 0.35, width * 0.55, height * 0.55, width * 0.78, height * 0.25);
                            ctx.stroke();
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        text: "GOOGLE MAPS"
                        color: "#f4f7fb"
                        font.pixelSize: 28
                        font.weight: Font.Medium
                        font.letterSpacing: 2
                    }
                }

                Row {
                    spacing: 14
                    PillButton { width: 180; label: "OPEN MAPS"; onClicked: Qt.openUrlExternally("https://www.google.com/maps/dir/?api=1") }
                    PillButton { width: 180; label: "HOME"; onClicked: Qt.openUrlExternally("https://www.google.com/maps/dir/?api=1&destination=Home") }
                    PillButton { width: 180; label: "RECENTER"; active: true }
                }
            }
        }
    }

    Item {
        anchors.fill: mainPanel
        anchors.margins: 24
        visible: root.activePage === "PHONE"

        Row {
            anchors.fill: parent
            spacing: 22

            GlassPanel {
                id: phoneDialPanel
                width: parent.width * 0.44
                height: parent.height

                Column {
                    anchors.centerIn: parent
                    spacing: 12

                    Text { anchors.horizontalCenter: parent.horizontalCenter; text: root.dialNumber || "ENTER NUMBER"; color: root.dialNumber ? "#f4f7fb" : "#5f7078"; font.pixelSize: 28; font.weight: Font.Medium }

                    Grid {
                        columns: 3
                        columnSpacing: 10
                        rowSpacing: 10
                        Repeater {
                            model: ["1","2","3","4","5","6","7","8","9","*","0","#"]
                            KeyButton { label: modelData; onClicked: root.dialNumber += modelData }
                        }
                    }

                    Row {
                        anchors.horizontalCenter: parent.horizontalCenter
                        spacing: 12
                        PillButton {
                            width: 88
                            label: "CALL"
                            active: true
                            activeColor: "#62f2c1"
                            onClicked: {
                                if (root.dialNumber.length > 0) {
                                    root.postBluetooth("/call/dial?number=" + encodeURIComponent(root.dialNumber));
                                }
                            }
                        }
                        PillButton { width: 88; label: "DELETE"; onClicked: root.dialNumber = root.dialNumber.slice(0, -1) }
                        PillButton { width: 88; label: "HANGUP"; active: true; activeColor: "#ff5b5b"; onClicked: root.postBluetooth("/call/hangup") }
                    }
                }
            }

            GlassPanel {
                id: phoneRecentPanel
                width: parent.width * 0.27
                height: parent.height
                Column {
                    anchors.fill: parent
                    anchors.margins: 24
                    spacing: 12
                    Text { text: "RECENT CALLS"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.DemiBold; font.letterSpacing: 2 }
                    InfoRow { label: "Lucka"; value: "Today" }
                    InfoRow { label: "Home"; value: "Yesterday" }
                    InfoRow { label: "Service"; value: "Monday" }
                }
            }

            GlassPanel {
                width: parent.width - phoneDialPanel.width - phoneRecentPanel.width - parent.spacing * 2
                height: parent.height
                Column {
                    anchors.fill: parent
                    anchors.margins: 24
                    spacing: 12
                    Text { text: "CONTACTS"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.DemiBold; font.letterSpacing: 2 }

                    Rectangle {
                        width: parent.width
                        height: 42
                        radius: 12
                        color: Qt.rgba(1, 1, 1, 0.06)
                        border.color: Qt.rgba(1, 1, 1, 0.10)
                        border.width: 1

                        TextInput {
                            anchors.fill: parent
                            anchors.leftMargin: 14
                            anchors.rightMargin: 14
                            verticalAlignment: TextInput.AlignVCenter
                            text: root.contactSearch
                            color: "#f4f7fb"
                            selectionColor: "#7ee3ff"
                            font.family: "sans-serif"
                            font.pixelSize: 14
                            onTextChanged: root.contactSearch = text
                        }

                        Text {
                            anchors.left: parent.left
                            anchors.leftMargin: 14
                            anchors.verticalCenter: parent.verticalCenter
                            visible: root.contactSearch.length === 0
                            text: "Search contacts"
                            color: "#5f7078"
                            font.family: "sans-serif"
                            font.pixelSize: 14
                        }
                    }

                    ContactRow { name: "Lucka"; detail: "+46"; number: "+46"; filter: root.contactSearch }
                    ContactRow { name: "Dad"; detail: "Mobile"; number: ""; filter: root.contactSearch }
                    ContactRow { name: "Garage"; detail: "Work"; number: ""; filter: root.contactSearch }
                }
            }
        }
    }

    Item {
        anchors.fill: mainPanel
        anchors.margins: 24
        visible: root.activePage === "SETTINGS"

        Row {
            anchors.fill: parent
            spacing: 22
            GlassPanel {
                id: settingsSystemPanel
                width: parent.width * 0.5
                height: parent.height
                Column {
                    anchors.fill: parent
                    anchors.margins: 28
                    spacing: 14
                    Text { text: "SYSTEM"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.DemiBold; font.letterSpacing: 2 }
                    InfoRow { label: "Vehicle WS"; value: vehicleClient.connected ? "CONNECTED" : "OFFLINE" }
                    InfoRow { label: "Head unit"; value: "1280 x 640" }
                    InfoRow { label: "Cluster"; value: "1920 x 720" }
                    PillButton { width: 180; label: "CLUSTER VIEW"; onClicked: root.requestView("cluster") }
                }
            }
            GlassPanel {
                width: parent.width - parent.spacing - settingsSystemPanel.width
                height: parent.height
                Column {
                    anchors.fill: parent
                    anchors.margins: 28
                    spacing: 14
                    Text { text: "AUDIO SOURCES"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.DemiBold; font.letterSpacing: 2 }
                    PillButton { width: 180; label: "BLUETOOTH"; active: root.audio.source === "bt"; onClicked: vehicleClient.sendCommand("audio/set", { "source": "bt" }) }
                    PillButton { width: 180; label: "SPOTIFY"; active: root.audio.source === "spotify"; onClicked: vehicleClient.sendCommand("audio/set", { "source": "spotify" }) }
                    PillButton { width: 180; label: "AUX"; active: root.audio.source === "aux"; onClicked: vehicleClient.sendCommand("audio/set", { "source": "aux" }) }
                }
            }
        }
    }

    Rectangle {
        id: quickBar
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: 64
        color: Qt.rgba(5 / 255, 6 / 255, 8 / 255, 0.90)
        border.color: Qt.rgba(1, 1, 1, 0.08)
        border.width: 1

        Row {
            anchors.fill: parent
            anchors.leftMargin: 18
            anchors.rightMargin: 18
            spacing: 18

            DockButton {
                label: "APPS"
                width: 56
                onClicked: root.launcherOpen = true
            }

            Row {
                anchors.verticalCenter: parent.verticalCenter
                spacing: 12
                width: 340

                Rectangle {
                    width: 42
                    height: 42
                    radius: 10
                    color: "#12191c"
                    clip: true

                    Image {
                        anchors.fill: parent
                        source: root.nowPlaying.artworkUrl || "file:///home/admin/digital-dash/public/albumcover.jpg"
                        fillMode: Image.PreserveAspectCrop
                    }
                }

                Column {
                    anchors.verticalCenter: parent.verticalCenter
                    width: 180
                    spacing: 2

                    Text {
                        width: parent.width
                        elide: Text.ElideRight
                        text: root.nowPlaying.title || "Not Playing"
                        color: "#f4f7fb"
                        font.family: "sans-serif"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                    }

                    Text {
                        width: parent.width
                        elide: Text.ElideRight
                        text: root.nowPlaying.artist || "-"
                        color: "#8b96a2"
                        font.family: "sans-serif"
                        font.pixelSize: 11
                    }
                }

                DockButton { label: root.nowPlaying.isPlaying ? "PAUSE" : "PLAY"; width: 72 }
            }

            Item { width: parent.width - 18 * 2 - 56 - 340 - 96 - 18 * 3; height: 1 }

            DockButton {
                label: Math.round(root.climate.tempSetC || 0) + " C"
                width: 96
            }
        }
    }

    Rectangle {
        id: appLauncherOverlay
        anchors.fill: parent
        z: 30
        visible: root.launcherOpen
        opacity: root.launcherOpen ? 1.0 : 0.0
        color: Qt.rgba(0, 0, 0, 0.92)

        Behavior on opacity { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }

        MouseArea {
            anchors.fill: parent
            onClicked: root.launcherOpen = false
        }

        Grid {
            id: launcherGrid
            anchors.centerIn: parent
            columns: 3
            rows: 2
            columnSpacing: 16
            rowSpacing: 16

            LauncherTile { label: "MEDIA"; icon: "media"; active: root.activePage === "MEDIA"; onClicked: { root.activePage = "MEDIA"; root.launcherOpen = false } }
            LauncherTile { label: "CLIMATE"; icon: "climate"; active: root.activePage === "CLIMATE"; onClicked: { root.activePage = "CLIMATE"; root.launcherOpen = false } }
            LauncherTile { label: "CAR"; icon: "car"; active: root.activePage === "CAR"; onClicked: { root.activePage = "CAR"; root.launcherOpen = false } }
            LauncherTile { label: "NAVIGATION"; icon: "nav"; active: root.activePage === "NAVIGATION"; onClicked: { root.activePage = "NAVIGATION"; root.launcherOpen = false } }
            LauncherTile { label: "PHONE"; icon: "phone"; active: root.activePage === "PHONE"; onClicked: { root.activePage = "PHONE"; root.launcherOpen = false } }
            LauncherTile { label: "SETTINGS"; icon: "settings"; active: root.activePage === "SETTINGS"; onClicked: { root.activePage = "SETTINGS"; root.launcherOpen = false } }
        }

    }

    component GlassPanel: Rectangle {
        radius: 24
        color: Qt.rgba(1, 1, 1, 0.05)
        border.color: Qt.rgba(1, 1, 1, 0.10)
        border.width: 1
    }

    component ProgressBar: Rectangle {
        property real value: 0

        height: 5
        radius: 3
        color: "#202832"

        Rectangle {
            height: parent.height
            radius: parent.radius
            color: "#f4f7fb"
            width: parent.width * Math.max(0, Math.min(1, parent.value))
        }
    }

    component InfoRow: Rectangle {
        property string label: ""
        property string value: ""

        width: parent ? parent.width : 220
        height: 42
        radius: 12
        color: Qt.rgba(1, 1, 1, 0.05)

        Text {
            anchors.left: parent.left
            anchors.leftMargin: 14
            anchors.verticalCenter: parent.verticalCenter
            text: label
            color: "#8b96a2"
            font.family: "sans-serif"
            font.pixelSize: 12
            font.weight: Font.DemiBold
        }

        Text {
            anchors.right: parent.right
            anchors.rightMargin: 14
            anchors.verticalCenter: parent.verticalCenter
            text: value
            color: "#f4f7fb"
            font.family: "sans-serif"
            font.pixelSize: 14
            font.weight: Font.Medium
        }
    }

    component ContactRow: Rectangle {
        property string name: ""
        property string detail: ""
        property string number: ""
        property string filter: ""

        width: parent ? parent.width : 220
        height: visible ? 42 : 0
        visible: filter.length === 0 || name.toLowerCase().indexOf(filter.toLowerCase()) !== -1 || detail.toLowerCase().indexOf(filter.toLowerCase()) !== -1
        radius: 12
        color: Qt.rgba(1, 1, 1, 0.05)

        Text {
            anchors.left: parent.left
            anchors.leftMargin: 14
            anchors.verticalCenter: parent.verticalCenter
            text: name
            color: "#f4f7fb"
            font.family: "sans-serif"
            font.pixelSize: 14
            font.weight: Font.Medium
        }

        Text {
            anchors.right: parent.right
            anchors.rightMargin: 14
            anchors.verticalCenter: parent.verticalCenter
            text: detail
            color: "#8b96a2"
            font.family: "sans-serif"
            font.pixelSize: 12
            font.weight: Font.DemiBold
        }

        MouseArea {
            anchors.fill: parent
            onClicked: {
                if (number.length > 0) {
                    root.dialNumber = number;
                }
            }
        }
    }

    component DockButton: Rectangle {
        signal clicked()
        property string label: ""

        height: 42
        radius: 12
        color: Qt.rgba(1, 1, 1, 0.07)

        Text {
            anchors.centerIn: parent
            text: label
            color: "#dce6ec"
            font.family: "sans-serif"
            font.pixelSize: 12
            font.weight: Font.DemiBold
            font.letterSpacing: 1.3
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }

    component PillButton: Rectangle {
        signal clicked()
        property string label: ""
        property bool active: false
        property color activeColor: "#7ee3ff"

        width: 120
        height: 42
        radius: 12
        color: active ? Qt.rgba(activeColor.r, activeColor.g, activeColor.b, 0.16) : Qt.rgba(1, 1, 1, 0.06)
        border.color: active ? activeColor : Qt.rgba(1, 1, 1, 0.10)
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: label
            color: active ? "#f4f7fb" : "#a6b0b7"
            font.family: "sans-serif"
            font.pixelSize: 12
            font.weight: Font.DemiBold
            font.letterSpacing: 1.1
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }

    component RoundButton: Rectangle {
        signal clicked()
        property string label: ""

        width: 56
        height: 56
        radius: width / 2
        color: Qt.rgba(1, 1, 1, 0.07)
        border.color: Qt.rgba(1, 1, 1, 0.12)
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: label
            color: "#f4f7fb"
            font.family: "sans-serif"
            font.pixelSize: 24
            font.weight: Font.Medium
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }

    component KeyButton: Rectangle {
        signal clicked()
        property string label: ""

        width: 72
        height: 50
        radius: 14
        color: Qt.rgba(1, 1, 1, 0.065)
        border.color: Qt.rgba(1, 1, 1, 0.09)
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: label
            color: "#f4f7fb"
            font.family: "sans-serif"
            font.pixelSize: 22
            font.weight: Font.Medium
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }

    component LauncherTile: Rectangle {
        signal clicked()
        property string label: ""
        property string icon: ""
        property bool active: false

        width: 132
        height: 132
        radius: 14
        color: active ? Qt.rgba(1, 1, 1, 0.14) : Qt.rgba(1, 1, 1, 0.065)
        border.color: active ? Qt.rgba(1, 1, 1, 0.16) : Qt.rgba(1, 1, 1, 0.045)
        border.width: 1

        Canvas {
            id: tileIcon
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top
            anchors.topMargin: 34
            width: 42
            height: 42

            onPaint: {
                var ctx = getContext("2d");
                ctx.reset();
                ctx.strokeStyle = active ? "#f4f7fb" : "#9a9ca3";
                ctx.fillStyle = active ? "#f4f7fb" : "#9a9ca3";
                ctx.lineWidth = 2.4;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                if (icon === "media") {
                    ctx.strokeRect(7, 11, 28, 22);
                    ctx.beginPath();
                    ctx.moveTo(18, 17);
                    ctx.lineTo(27, 22);
                    ctx.lineTo(18, 27);
                    ctx.closePath();
                    ctx.fill();
                } else if (icon === "climate") {
                    ctx.beginPath();
                    ctx.moveTo(21, 8);
                    ctx.lineTo(21, 34);
                    ctx.moveTo(14, 14);
                    ctx.lineTo(28, 14);
                    ctx.moveTo(14, 28);
                    ctx.lineTo(28, 28);
                    ctx.stroke();
                } else if (icon === "car") {
                    ctx.beginPath();
                    ctx.moveTo(9, 25);
                    ctx.lineTo(12, 17);
                    ctx.lineTo(30, 17);
                    ctx.lineTo(33, 25);
                    ctx.lineTo(33, 30);
                    ctx.lineTo(9, 30);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(14, 31, 2.5, 0, Math.PI * 2);
                    ctx.arc(28, 31, 2.5, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (icon === "nav") {
                    ctx.beginPath();
                    ctx.moveTo(21, 5);
                    ctx.lineTo(34, 37);
                    ctx.lineTo(21, 30);
                    ctx.lineTo(8, 37);
                    ctx.closePath();
                    ctx.stroke();
                } else if (icon === "phone") {
                    ctx.beginPath();
                    ctx.moveTo(15, 8);
                    ctx.quadraticCurveTo(10, 10, 13, 18);
                    ctx.quadraticCurveTo(17, 29, 29, 32);
                    ctx.quadraticCurveTo(34, 33, 34, 27);
                    ctx.lineTo(28, 24);
                    ctx.lineTo(24, 28);
                    ctx.quadraticCurveTo(17, 25, 16, 18);
                    ctx.lineTo(20, 14);
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(21, 21, 8, 0, Math.PI * 2);
                    ctx.stroke();
                    for (var i = 0; i < 8; i++) {
                        var a = i * Math.PI / 4;
                        ctx.beginPath();
                        ctx.moveTo(21 + Math.cos(a) * 13, 21 + Math.sin(a) * 13);
                        ctx.lineTo(21 + Math.cos(a) * 17, 21 + Math.sin(a) * 17);
                        ctx.stroke();
                    }
                }
            }

            Connections {
                target: parent
                function onActiveChanged() { tileIcon.requestPaint(); }
                function onIconChanged() { tileIcon.requestPaint(); }
            }

            Component.onCompleted: requestPaint()
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 24
            text: label
            color: active ? "#f4f7fb" : "#9a9ca3"
            font.family: "sans-serif"
            font.pixelSize: 11
            font.weight: Font.Bold
            font.letterSpacing: 1.6
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }
}

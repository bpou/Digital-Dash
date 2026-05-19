import QtQuick
import QtQuick.Effects

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
    property var gps: safeState.gps || ({})

    property real rpm: engine.rpm || 3600
    property real speed: vehicle.speedKmh || 90
    property real fuel: fuelState.percent || 23
    property real battery: electrical.batteryV || 13.2
    property real oilTemp: temp.oilC || 88
    property real coolantTemp: temp.coolantC || 0
    property real boostBar: {
        if (engine.boostBar !== undefined) return Number(engine.boostBar);
        if (engine.boostPsi !== undefined) return Number(engine.boostPsi) / 14.5038;
        if (engine.mapKpa !== undefined) return Math.max(0, (Number(engine.mapKpa) - 101.325) / 100);
        return 0;
    }
    property int musicPosition: nowPlaying.positionSec || 0
    property int musicDuration: nowPlaying.durationSec || 0
    property int displayMusicPosition: Math.round(clamp(musicPosition, 0, musicDuration > 0 ? musicDuration : musicPosition))
    property real musicProgress: clamp(displayMusicPosition / Math.max(1, musicDuration), 0, 1)
    property string displayedTitle: ""
    property string displayedArtist: ""
    property string displayedAlbum: ""
    property string displayedArtwork: ""
    property string displayedTrackKey: ""
    property string pendingTitle: ""
    property string pendingArtist: ""
    property string pendingAlbum: ""
    property string pendingArtwork: ""
    property string pendingTrackKey: ""
    property bool pendingHasMedia: false
    property bool mediaVisible: false
    property bool artworkVisible: false
    property bool defaultArtworkVisible: false
    property string artworkSource: displayedArtwork
    property date clockTime: new Date()

    function clamp(value, minValue, maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    }

    function formatDuration(totalSeconds) {
        var safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        var minutes = Math.floor(safeSeconds / 60);
        var seconds = safeSeconds % 60;
        return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    }

    function headingLabel(value) {
        if (value === undefined || value === null || isNaN(value)) {
            return "N";
        }
        var labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        var normalized = ((value % 360) + 360) % 360;
        return labels[Math.round(normalized / 45) % labels.length];
    }

    function mediaControl(action) {
        vehicleClient.sendCommand("bt/media/control", { "action": action });
    }

    function mediaKey(title, artist, album) {
        return [title || "", artist || "", album || ""].join("\u001f");
    }

    function queueMediaUpdate() {
        var nextTitle = nowPlaying.title || "";
        var nextArtist = nowPlaying.artist || "";
        var nextAlbum = nowPlaying.album || "";
        var nextArtwork = nowPlaying.artworkUrl || "";
        var nextHasMedia = (nextTitle || nextArtist || nextAlbum || nextArtwork) ? true : false;
        var nextKey = nextHasMedia ? mediaKey(nextTitle, nextArtist, nextAlbum) : "";

        pendingTitle = nextTitle;
        pendingArtist = nextArtist;
        pendingAlbum = nextAlbum;
        pendingArtwork = nextArtwork;
        pendingTrackKey = nextKey;
        pendingHasMedia = nextHasMedia;

        if (nextKey !== displayedTrackKey) {
            fallbackArtworkTimer.stop();
            artworkSwapTimer.stop();
            mediaVisible = false;
            artworkVisible = false;
            defaultArtworkVisible = false;
            mediaSwapTimer.restart();
            return;
        }

        if (nextArtwork !== displayedArtwork) {
            fallbackArtworkTimer.stop();
            defaultArtworkVisible = false;
            artworkVisible = false;
            artworkSwapTimer.restart();
        } else if (nextHasMedia && !nextArtwork && !defaultArtworkVisible) {
            fallbackArtworkTimer.restart();
        }
    }

    onNowPlayingChanged: queueMediaUpdate()

    Timer {
        id: mediaSwapTimer
        interval: 280
        repeat: false
        onTriggered: {
            displayedTitle = pendingTitle;
            displayedArtist = pendingArtist;
            displayedAlbum = pendingAlbum;
            displayedArtwork = pendingArtwork;
            displayedTrackKey = pendingTrackKey;
            mediaVisible = pendingHasMedia;
            artworkVisible = pendingHasMedia && pendingArtwork.length > 0;
            defaultArtworkVisible = false;
            if (pendingHasMedia && pendingArtwork.length === 0) {
                fallbackArtworkTimer.restart();
            }
        }
    }

    Timer {
        id: artworkSwapTimer
        interval: 240
        repeat: false
        onTriggered: {
            displayedArtwork = pendingArtwork;
            artworkVisible = pendingArtwork.length > 0;
            if (pendingHasMedia && pendingArtwork.length === 0) {
                fallbackArtworkTimer.restart();
            }
        }
    }

    Timer {
        id: fallbackArtworkTimer
        interval: 5000
        repeat: false
        onTriggered: {
            if (mediaVisible && displayedArtwork.length === 0) {
                defaultArtworkVisible = true;
            }
        }
    }

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: root.clockTime = new Date()
    }

    Component.onCompleted: queueMediaUpdate()

    Rectangle {
        anchors.fill: parent
        color: "#020405"

        Rectangle {
            anchors.fill: parent
            gradient: Gradient {
                GradientStop { position: 0.00; color: "#0b1518" }
                GradientStop { position: 0.46; color: "#020405" }
                GradientStop { position: 1.00; color: "#010202" }
            }
        }

        Canvas {
            anchors.fill: parent
            opacity: 0.48
            onPaint: {
                var ctx = getContext("2d");
                ctx.reset();

                var g = ctx.createRadialGradient(width * 0.20, height * 0.42, 0, width * 0.20, height * 0.42, width * 0.36);
                g.addColorStop(0.0, "rgba(102, 229, 255, 0.20)");
                g.addColorStop(1.0, "rgba(102, 229, 255, 0.00)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, width, height);

                g = ctx.createRadialGradient(width * 0.78, height * 0.44, 0, width * 0.78, height * 0.44, width * 0.34);
                g.addColorStop(0.0, "rgba(180, 248, 200, 0.16)");
                g.addColorStop(1.0, "rgba(180, 248, 200, 0.00)");
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, width, height);
            }
            Component.onCompleted: requestPaint()
        }
    }

    MultiEffect {
        anchors.fill: shell
        source: shell
        autoPaddingEnabled: true
        shadowEnabled: true
        shadowBlur: 0.70
        shadowScale: 1.015
        shadowOpacity: 0.38
        shadowColor: "#000000"
    }

    Rectangle {
        id: shell
        anchors.fill: parent
        anchors.margins: 10
        radius: 28
        color: "#05090b"
        opacity: 0.92
        border.color: "#1c2a2e"
        border.width: 1
    }

    Rectangle {
        anchors.fill: shell
        anchors.margins: 10
        radius: 22
        color: "transparent"
        border.color: "#132428"
        border.width: 1
        opacity: 0.95
    }



    Row {
        anchors.right: shell.right
        anchors.top: shell.top
        anchors.rightMargin: 42
        anchors.topMargin: 26
        spacing: 12



        Text {
            text: Qt.formatTime(root.clockTime, "HH:mm")
            color: "#d6dee4"
            font.family: "sans-serif"
            font.pixelSize: 13
            font.weight: Font.DemiBold
        }
    }

    QtGauge {
        id: rpmGauge
        anchors.left: shell.left
        anchors.leftMargin: parent.width * 0.04
        anchors.verticalCenter: parent.verticalCenter
        width: parent.width * 0.30
        height: width
        value: root.rpm
        maximumValue: 8000
        majorStep: 2000
        label: "RPM"
       
        valueText: Math.round(root.rpm).toString()
        accentColor: "#66e5ff"
        warnColor: "#ff4d5e"
        dangerAt: 6500
        reverse: false
    }

    QtGauge {
        id: speedGauge
        anchors.right: shell.right
        anchors.rightMargin: parent.width * 0.04
        anchors.verticalCenter: parent.verticalCenter
        width: parent.width * 0.30
        height: width
        value: root.speed
        maximumValue: 180
        majorStep: 30
        label: "KM/H"
       
        valueText: Math.round(root.speed).toString()
        accentColor: "#b4f8c8"
        warnColor: "#ff4d5e"
        dangerAt: 160
        reverse: false
    }

    Item {
        id: mediaPlayer
        anchors.fill: parent

        Item {
    id: boostModule
    anchors.horizontalCenter: parent.horizontalCenter
    anchors.bottom: coverFrame.top
    anchors.bottomMargin: 55

    width: Math.min(root.width * 0.16, 210)
    height: 46

    property real pct: root.clamp(root.boostBar / 2.0, 0, 1)
    property color boostColor: root.boostBar >= 1.6 ? "#ff4d5e" : "#ffd166"
    property color dimText: "#6f7f86"
    property color brightText: "#dce8ee"

    Rectangle {
        id: boostGlass
        anchors.fill: parent
        radius: 14
        color: "#05090c"
        opacity: 0.72
        border.width: 1
        border.color: "#10242b"
    }

    MultiEffect {
        anchors.fill: boostGlass
        source: boostGlass
        autoPaddingEnabled: true
        shadowEnabled: true
        shadowBlur: 0.45
        shadowScale: 1.02
        shadowOpacity: 0.28
        shadowColor: "#2fe8ff"
        opacity: 0.55
    }

    Row {
        id: boostTextRow
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.top: parent.top
        anchors.topMargin: 7
        spacing: 7

        Text {
            anchors.baseline: boostValue.baseline
            text: "BOOST"
            color: boostModule.dimText
            font.family: "sans-serif"
            font.pixelSize: 8
            font.weight: Font.Bold
            font.letterSpacing: 2.2
        }

        Text {
            id: boostValue
            text: root.boostBar.toFixed(1)
            color: boostModule.boostColor
            font.family: "sans-serif"
            font.pixelSize: 21
            font.weight: Font.Bold
        }

        Text {
            anchors.baseline: boostValue.baseline
            text: "BAR"
            color: "#9aa8ae"
            font.family: "sans-serif"
            font.pixelSize: 8
            font.weight: Font.Bold
            font.letterSpacing: 2
        }
    }

    Rectangle {
        id: boostTrack
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.leftMargin: 18
        anchors.rightMargin: 18
        anchors.bottomMargin: 8

        height: 3
        radius: 2
        color: "#152329"

        Rectangle {
            id: boostBarFill
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter

            width: Math.max(6, parent.width * boostModule.pct)
            height: parent.height
            radius: parent.radius
            color: boostModule.boostColor
        }

        MultiEffect {
            anchors.fill: boostBarFill
            source: boostBarFill
            autoPaddingEnabled: true
            blurEnabled: true
            blurMax: 18
            blur: 0.75
            shadowEnabled: true
            shadowBlur: 0.65
            shadowScale: 1.08
            shadowOpacity: 0.65
            shadowColor: boostModule.boostColor
            opacity: 0.85
        }
    }
}

        MultiEffect {
            anchors.centerIn: coverFrame
            width: coverFrame.width
            height: coverFrame.height
            source: coverImage
            autoPaddingEnabled: true
            blurEnabled: true
            blurMax: 72
            blur: 1.0
            saturation: 1.35
            brightness: 0.02
            shadowEnabled: true
            shadowBlur: 1.0
            shadowScale: 1.34
            shadowOpacity: 0.12
            shadowColor: "#ffffff"
            opacity: coverImage.status === Image.Ready && root.artworkVisible ? (root.nowPlaying.isPlaying ? 0.24 : 0.16) : 0.0

            Behavior on opacity { NumberAnimation { duration: 260; easing.type: Easing.OutCubic } }
        }

        MultiEffect {
            anchors.centerIn: coverFrame
            width: coverFrame.width
            height: coverFrame.height
            source: coverImage
            autoPaddingEnabled: true
            blurEnabled: true
            blurMax: 48
            blur: 0.86
            saturation: 1.55
            brightness: 0.04
            shadowEnabled: true
            shadowBlur: 0.86
            shadowScale: 1.20
            shadowOpacity: 0.16
            shadowColor: "#ffffff"
            opacity: coverImage.status === Image.Ready && root.artworkVisible ? (root.nowPlaying.isPlaying ? 0.28 : 0.18) : 0.0

            Behavior on opacity { NumberAnimation { duration: 260; easing.type: Easing.OutCubic } }
        }

        MultiEffect {
            anchors.centerIn: coverFrame
            width: coverFrame.width
            height: coverFrame.height
            source: coverImage
            autoPaddingEnabled: true
            shadowEnabled: true
            shadowBlur: 1.0
            shadowScale: 1.12
            shadowOpacity: 0.32
            shadowColor: "#000000"
            opacity: coverImage.status === Image.Ready && root.artworkVisible ? 1.0 : 0.0

            Behavior on opacity { NumberAnimation { duration: 220; easing.type: Easing.OutCubic } }
        }

        Rectangle {
            id: coverFrame
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter: parent.verticalCenter
            width: Math.min(root.width * 0.125, root.height * 0.34)
            height: width
            radius: 0
            color: "transparent"
            border.width: 0
            clip: true
            opacity: (coverImage.status === Image.Ready && root.artworkVisible) || root.defaultArtworkVisible ? 1.0 : 0.0

            Behavior on opacity { NumberAnimation { duration: 220; easing.type: Easing.OutCubic } }

            Image {
                id: coverImage
                anchors.fill: parent
                source: root.artworkSource
                fillMode: Image.PreserveAspectCrop
                smooth: true
                mipmap: true
                cache: false
                asynchronous: true
                opacity: status === Image.Ready ? 1.0 : 0.0
            }

            Rectangle {
                anchors.fill: parent
                opacity: root.defaultArtworkVisible ? 1.0 : 0.0
                gradient: Gradient {
                    GradientStop { position: 0.00; color: "#172025" }
                    GradientStop { position: 0.48; color: "#0b1114" }
                    GradientStop { position: 1.00; color: "#05090b" }
                }

                Behavior on opacity { NumberAnimation { duration: 220; easing.type: Easing.OutCubic } }

                Rectangle {
                    anchors.centerIn: parent
                    width: parent.width * 0.36
                    height: width
                    radius: width / 2
                    color: Qt.rgba(255, 255, 255, 0.035)
                    border.color: Qt.rgba(255, 255, 255, 0.11)
                    border.width: 1
                }

                Text {
                    anchors.centerIn: parent
                    text: "BT"
                    color: "#738188"
                    font.family: "sans-serif"
                    font.pixelSize: parent.width * 0.16
                    font.weight: Font.Bold
                    font.letterSpacing: 3
                }
            }

            Rectangle {
                anchors.fill: parent
                gradient: Gradient {
                    GradientStop { position: 0.00; color: Qt.rgba(1, 1, 1, 0.10) }
                    GradientStop { position: 0.56; color: Qt.rgba(0, 0, 0, 0.00) }
                    GradientStop { position: 1.00; color: Qt.rgba(0, 0, 0, 0.35) }
                }
            }

            Rectangle {
                anchors.left: parent.left
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                width: parent.width * 0.30
                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.72) }
                    GradientStop { position: 0.48; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.24) }
                    GradientStop { position: 1.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.00) }
                }
            }

            Rectangle {
                anchors.right: parent.right
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                width: parent.width * 0.30
                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.00) }
                    GradientStop { position: 0.52; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.24) }
                    GradientStop { position: 1.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.72) }
                }
            }

            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.top: parent.top
                height: parent.height * 0.26
                gradient: Gradient {
                    GradientStop { position: 0.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.60) }
                    GradientStop { position: 0.52; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.18) }
                    GradientStop { position: 1.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.00) }
                }
            }

            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: parent.height * 0.26
                gradient: Gradient {
                    GradientStop { position: 0.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.00) }
                    GradientStop { position: 0.48; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.18) }
                    GradientStop { position: 1.00; color: Qt.rgba(5 / 255, 9 / 255, 11 / 255, 0.60) }
                }
            }

            Text {
                anchors.centerIn: parent
                visible: false
                text: "M"
                color: "#b9cbd1"
                font.pixelSize: parent.width * 0.34
                font.weight: Font.Bold
            }
        }

        Item {
            id: mediaCore
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: coverFrame.bottom
            anchors.topMargin: 18
            width: root.width * 0.30
            height: 84
            opacity: root.mediaVisible ? 1.0 : 0.0

            Behavior on opacity { NumberAnimation { duration: 220; easing.type: Easing.OutCubic } }

            Row {
                id: sourceRow
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 0
                spacing: 8

                Rectangle {
                    width: 6
                    height: 6
                    radius: 3
                    anchors.verticalCenter: parent.verticalCenter
                    color: root.nowPlaying.isPlaying ? "#8fffd0" : "#68757a"
                }

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: (root.audio.source || "bt").toUpperCase()
                    color: "#7f9299"
                    font.family: "sans-serif"
                    font.pixelSize: 9
                    font.weight: Font.Bold
                    font.letterSpacing: 2
                }
            }

            Text {
                id: trackTitle
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: sourceRow.bottom
                anchors.topMargin: 6
                width: parent.width - 28
                horizontalAlignment: Text.AlignHCenter
                elide: Text.ElideRight
                text: root.displayedTitle
                color: "#ffffff"
                font.family: "sans-serif"
                font.pixelSize: 17
                font.weight: Font.Bold
            }

            Text {
                id: trackArtist
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: trackTitle.bottom
                anchors.topMargin: 2
                width: parent.width - 42
                horizontalAlignment: Text.AlignHCenter
                elide: Text.ElideRight
                text: root.displayedArtist || root.displayedAlbum
                color: "#9daab0"
                font.family: "sans-serif"
                font.pixelSize: 10
                font.weight: Font.DemiBold
            }

            Rectangle {
                id: progressTrack
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.top: trackArtist.bottom
                anchors.topMargin: 7
                anchors.leftMargin: 28
                anchors.rightMargin: 28
                height: 4
                radius: 3
                color: "#162226"

                Rectangle {
                    width: parent.width * root.musicProgress
                    height: parent.height
                    radius: parent.radius
                    color: "#c9eee1"
                }

                Rectangle {
                    width: Math.max(6, parent.width * root.musicProgress)
                    height: 1
                    radius: 1
                    color: "#ffffff"
                    opacity: 0.58
                }
            }

            Row {
                id: elapsedRow
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: progressTrack.bottom
                anchors.topMargin: 6
                spacing: 16

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: root.formatDuration(root.displayMusicPosition)
                    color: "#b8c7cc"
                    font.family: "sans-serif"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                }

                Rectangle {
                    width: 20
                    height: 20
                    radius: 10
                    anchors.verticalCenter: parent.verticalCenter
                    color: root.nowPlaying.isPlaying ? "#17343d" : "#12191c"
                    border.color: root.nowPlaying.isPlaying ? "#66e5ff" : "#3a454a"
                    border.width: 1

                    Canvas {
                        id: playIconCanvas
                        anchors.centerIn: parent
                        width: 10
                        height: 10
                        onPaint: {
                            var ctx = getContext("2d");
                            ctx.reset();
                            ctx.fillStyle = "#ffffff";
                            if (root.nowPlaying.isPlaying) {
                                ctx.fillRect(2, 1, 2, 8);
                                ctx.fillRect(6, 1, 2, 8);
                            } else {
                                ctx.beginPath();
                                ctx.moveTo(3, 1);
                                ctx.lineTo(9, 5);
                                ctx.lineTo(3, 9);
                                ctx.closePath();
                                ctx.fill();
                            }
                        }

                        Connections {
                            target: root
                            function onNowPlayingChanged() { playIconCanvas.requestPaint(); }
                        }
                        Component.onCompleted: requestPaint()
                    }

                    MouseArea {
                        anchors.fill: parent
                        onClicked: root.mediaControl(root.nowPlaying.isPlaying ? "pause" : "play")
                    }
                }

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: "-" + root.formatDuration(root.musicDuration - root.displayMusicPosition)
                    color: "#68777d"
                    font.family: "sans-serif"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                }
            }
        }
    }

    Row {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: shell.bottom
        anchors.bottomMargin: 22
        width: parent.width * 0.72
        spacing: 20

        BarMeter { width: (parent.width - 40) / 3; label: "OIL"; value: root.oilTemp; minValue: 40; maxValue: 140; suffix: "C"; warn: root.oilTemp >= 110 }
        BarMeter { width: (parent.width - 40) / 3; label: "COOLANT"; value: root.coolantTemp; minValue: 40; maxValue: 120; suffix: "C"; warn: root.coolantTemp >= 100 }
        BarMeter { width: (parent.width - 40) / 3; label: "FUEL"; value: root.fuel; minValue: 0; maxValue: 100; suffix: "%"; warn: root.fuel <= 15 }
    }

    Text {
        anchors.right: shell.right
        anchors.bottom: shell.bottom
        anchors.rightMargin: 42
        anchors.bottomMargin: 24
        text: "180000 km"
        color: "#455259"
        font.family: "sans-serif"
        font.pixelSize: 12
    }

    component MetricTile: Rectangle {
        property string label: ""
        property string value: ""
        property string detail: ""
        property color accent: "#d8f7ff"

        width: parent ? parent.width : 170
        height: 68
        radius: 14
        color: "#12191c"
        opacity: 0.95
        border.color: "#273238"
        border.width: 1

        Column {
            anchors.left: parent.left
            anchors.leftMargin: 14
            anchors.right: parent.right
            anchors.rightMargin: 12
            anchors.verticalCenter: parent.verticalCenter
            spacing: 3

            Text {
                text: label
                color: "#6f858d"
                font.family: "sans-serif"
                font.pixelSize: 10
                font.weight: Font.DemiBold
            }

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: value
                color: accent
                font.family: "sans-serif"
                font.pixelSize: 22
                font.weight: Font.Bold
            }

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: detail
                color: "#748087"
                font.family: "sans-serif"
                font.pixelSize: 10
            }
        }
    }

    component LampChip: Rectangle {
        property string label: ""
        property bool active: false
        property color colorOn: "#7ee3ff"

        width: 54
        height: 28
        radius: 14
        color: active ? Qt.rgba(colorOn.r, colorOn.g, colorOn.b, 0.18) : "#101719"
        border.color: active ? colorOn : "#2a363b"
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: label
            color: active ? "#ffffff" : "#66747a"
            font.family: "sans-serif"
            font.pixelSize: 10
            font.weight: Font.Bold
        }
    }

    component TurnArrow: Canvas {
        property bool active: false
        property bool mirror: false

        width: 30
        height: 24
        opacity: active ? 1.0 : 0.24

        onPaint: {
            var ctx = getContext("2d");
            ctx.reset();
            ctx.fillStyle = "#9fffd1";
            ctx.beginPath();
            if (mirror) {
                ctx.moveTo(width, 0);
                ctx.lineTo(0, height / 2);
                ctx.lineTo(width, height);
            } else {
                ctx.moveTo(0, 0);
                ctx.lineTo(width, height / 2);
                ctx.lineTo(0, height);
            }
            ctx.closePath();
            ctx.fill();
        }

        onActiveChanged: requestPaint()
        Component.onCompleted: requestPaint()
    }

    component MediaButton: Rectangle {
        signal clicked()
        property string label: ""
        property bool primary: false

        width: primary ? 40 : 32
        height: width
        radius: width / 2
        color: primary ? "#18313a" : "#141b1e"
        border.color: primary ? "#5ecfe9" : "#3a454a"
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: label
            color: "#ffffff"
            font.pixelSize: primary ? 18 : 20
            font.weight: Font.Bold
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }

    component BarMeter: Item {
        property string label: ""
        property real value: 0
        property real minValue: 0
        property real maxValue: 100
        property string suffix: ""
        property bool warn: false

        function clampValue(input, minValue, maxValue) {
            return Math.max(minValue, Math.min(maxValue, input));
        }

        width: parent ? parent.width : 360
        height: 24

        Text {
            anchors.left: parent.left
            text: label
            color: "#7b8a90"
            font.family: "sans-serif"
            font.pixelSize: 10
            font.weight: Font.Bold
        }

        Text {
            anchors.right: parent.right
            text: Math.round(value) + suffix
            color: warn ? "#ffd166" : "#ffffff"
            font.family: "sans-serif"
            font.pixelSize: 10
            font.weight: Font.Bold
        }

        Rectangle {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            height: 5
            radius: 3
            color: "#20282b"

            Rectangle {
                width: parent.width * clampValue((value - minValue) / Math.max(1, maxValue - minValue), 0, 1)
                height: parent.height
                radius: parent.radius
                color: warn ? "#ffd166" : "#c9eee1"
            }
        }
    }

    component QtGauge: Item {
        id: gaugeRoot

        property real value: 0
        property real maximumValue: 100
        property real majorStep: 20
        property string label: ""
        property string subLabel: ""
        property string valueText: ""
        property color accentColor: "#66e5ff"
        property color warnColor: "#ff4d5e"
        property real dangerAt: maximumValue + 1
        property bool reverse: false
        property real displayValue: value

        function clampValue(input, minValue, maxValue) {
            return Math.max(minValue, Math.min(maxValue, input));
        }

        function sign(value) {
            return value < 0 ? -1 : 1;
        }

        function rgbaString(colorValue, alpha) {
            return "rgba(" +
                Math.round(colorValue.r * 255) + "," +
                Math.round(colorValue.g * 255) + "," +
                Math.round(colorValue.b * 255) + "," +
                alpha + ")";
        }

        function squirclePoint(size, inset, power, normalized, startAngle, sweep) {
            var side = size / 2 - inset;
            var t = startAngle + sweep * normalized;
            var cosValue = Math.cos(t);
            var sinValue = Math.sin(t);
            var x = sign(cosValue) * Math.pow(Math.abs(cosValue), 2 / power) * side + size / 2;
            var y = sign(sinValue) * Math.pow(Math.abs(sinValue), 2 / power) * side + size / 2;
            return { x: x, y: y, angle: t };
        }

        function buildSquircleSamples(size, inset, power, startAngle, sweep, steps) {
            var points = [];
            var total = 0;
            var previous = null;
            for (var si = 0; si <= steps; si++) {
                var normalized = si / steps;
                var point = squirclePoint(size, inset, power, normalized, startAngle, sweep);
                if (previous !== null) {
                    var dx = point.x - previous.x;
                    var dy = point.y - previous.y;
                    total += Math.sqrt(dx * dx + dy * dy);
                }
                point.distance = total;
                points.push(point);
                previous = point;
            }
            return { points: points, length: total };
        }

        function sampleAt(samples, normalized) {
            var target = samples.length * clampValue(normalized, 0, 1);
            var points = samples.points;
            if (target <= 0) {
                return points[0];
            }
            if (target >= samples.length) {
                return points[points.length - 1];
            }

            for (var si = 1; si < points.length; si++) {
                if (points[si].distance >= target) {
                    var before = points[si - 1];
                    var after = points[si];
                    var span = Math.max(0.001, after.distance - before.distance);
                    var local = (target - before.distance) / span;
                    return {
                        x: before.x + (after.x - before.x) * local,
                        y: before.y + (after.y - before.y) * local,
                        angle: before.angle + (after.angle - before.angle) * local
                    };
                }
            }
            return points[points.length - 1];
        }

        function drawSamples(ctx, samples, normalizedEnd, closePath) {
            var target = samples.length * clampValue(normalizedEnd, 0, 1);
            var points = samples.points;
            ctx.moveTo(points[0].x, points[0].y);
            for (var si = 1; si < points.length && points[si].distance <= target; si++) {
                ctx.lineTo(points[si].x, points[si].y);
            }
            if (target > 0 && target < samples.length) {
                var point = sampleAt(samples, normalizedEnd);
                ctx.lineTo(point.x, point.y);
            }
            if (closePath) {
                ctx.closePath();
            }
        }

        onValueChanged: displayValue = value

        Canvas {
            id: staticGaugeCanvas
            anchors.fill: parent
            antialiasing: true

            onPaint: {
                var ctx = getContext("2d");
                var w = width;
                var h = height;
                var cx = w / 2;
                var cy = h / 2;
                var size = Math.min(w, h);
                var xOffset = (w - size) / 2;
                var yOffset = (h - size) / 2;
                var fullStart = Math.PI * 0.75;
                var fullSweep = Math.PI * 2;
                var scaleSweep = Math.PI * 1.5;
                var power = 5.8;
                var liveColor = displayValue >= dangerAt ? warnColor : accentColor;
                var trackInset = size * 0.095;
                var activeTrack = buildSquircleSamples(size, trackInset, power, fullStart, scaleSweep, 210);
                var innerFrame = buildSquircleSamples(size, size * 0.255, power, fullStart, fullSweep, 220);
                var tickOuter = buildSquircleSamples(size, size * 0.057, power, fullStart, fullSweep, 260);
                var tickInnerMajor = buildSquircleSamples(size, size * 0.155, power, fullStart, fullSweep, 260);
                var tickInnerMinor = buildSquircleSamples(size, size * 0.125, power, fullStart, fullSweep, 260);
                var labelTrack = buildSquircleSamples(size, size * 0.028, power, fullStart, scaleSweep, 210);

                ctx.reset();
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.translate(xOffset, yOffset);

                ctx.lineWidth = Math.max(7, size * 0.020);
                ctx.strokeStyle = "rgba(190,205,212,0.32)";
                ctx.beginPath();
                drawSamples(ctx, activeTrack, 1, false);
                ctx.stroke();

                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(255,255,255,0.055)";
                ctx.beginPath();
                drawSamples(ctx, innerFrame, 1, true);
                ctx.stroke();

                var minorPerMajor = 5;
                var majorIntervals = Math.max(1, Math.round(maximumValue / Math.max(1, majorStep)));
                var tickIntervals = Math.max(40, majorIntervals * minorPerMajor * 4);
                for (var i = 0; i <= tickIntervals; i++) {
                    var amount = i / tickIntervals;
                    var major = i % (minorPerMajor * 2) === 0;
                    var outerPoint = sampleAt(tickOuter, amount);
                    var innerPoint = sampleAt(major ? tickInnerMajor : tickInnerMinor, amount);
                    ctx.lineWidth = major ? 2 : 1;
                    ctx.strokeStyle = major ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.24)";
                    ctx.beginPath();
                    ctx.moveTo(innerPoint.x, innerPoint.y);
                    ctx.lineTo(outerPoint.x, outerPoint.y);
                    ctx.stroke();
                }

                for (var labelValue = 0; labelValue <= maximumValue; labelValue += majorStep) {
                    var labelPct = labelValue / maximumValue;
                    var labelPoint = sampleAt(labelTrack, labelPct);
                    ctx.fillStyle = "rgba(255,255,255,0.42)";
                    ctx.font = "bold 15px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    var shown = maximumValue > 1000 ? Math.round(labelValue / 1000).toString() : Math.round(labelValue).toString();
                    ctx.fillText(shown, labelPoint.x, labelPoint.y);
                }
            }

            Connections {
                target: gaugeRoot
                function onDangerAtChanged() { staticGaugeCanvas.requestPaint(); }
                function onReverseChanged() { staticGaugeCanvas.requestPaint(); }
                function onAccentColorChanged() { staticGaugeCanvas.requestPaint(); }
                function onWarnColorChanged() { staticGaugeCanvas.requestPaint(); }
                function onMaximumValueChanged() { staticGaugeCanvas.requestPaint(); }
                function onMajorStepChanged() { staticGaugeCanvas.requestPaint(); }
                function onWidthChanged() { staticGaugeCanvas.requestPaint(); }
                function onHeightChanged() { staticGaugeCanvas.requestPaint(); }
            }

            Component.onCompleted: requestPaint()
        }

        Canvas {
            id: gaugeCanvas
            anchors.fill: parent
            antialiasing: true

            onPaint: {
                var ctx = getContext("2d");
                var w = width;
                var h = height;
                var size = Math.min(w, h);
                var xOffset = (w - size) / 2;
                var yOffset = (h - size) / 2;
                var fullStart = Math.PI * 0.75;
                var scaleSweep = Math.PI * 1.5;
                var power = 5.8;
                var pct = clampValue(displayValue / Math.max(1, maximumValue), 0, 1);
                var liveColor = displayValue >= dangerAt ? warnColor : accentColor;
                var activeTrack = buildSquircleSamples(size, size * 0.095, power, fullStart, scaleSweep, 210);

                ctx.reset();
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.translate(xOffset, yOffset);

                ctx.lineWidth = Math.max(9, size * 0.026);
                ctx.strokeStyle = rgbaString(liveColor, 1);
                ctx.beginPath();
                drawSamples(ctx, activeTrack, pct, false);
                ctx.stroke();
            }

            Connections {
                target: gaugeRoot
                function onDisplayValueChanged() { gaugeCanvas.requestPaint(); }
                function onDangerAtChanged() { gaugeCanvas.requestPaint(); }
                function onAccentColorChanged() { gaugeCanvas.requestPaint(); }
                function onWarnColorChanged() { gaugeCanvas.requestPaint(); }
                function onMaximumValueChanged() { gaugeCanvas.requestPaint(); }
                function onWidthChanged() { gaugeCanvas.requestPaint(); }
                function onHeightChanged() { gaugeCanvas.requestPaint(); }
            }

            Component.onCompleted: requestPaint()
        }

        MultiEffect {
            z: -1
            anchors.fill: gaugeCanvas
            source: gaugeCanvas
            autoPaddingEnabled: true
            blurEnabled: true
            blurMax: 52
            blur: 1.0
            saturation: 1.70
            brightness: 0.22
            shadowEnabled: true
            shadowBlur: 1.0
            shadowScale: 1.10
            shadowOpacity: 0.62
            shadowColor: displayValue >= dangerAt ? warnColor : accentColor
            opacity: 0.72
        }

        Text {
            anchors.centerIn: parent
            anchors.verticalCenterOffset: -8
            text: valueText
            color: "#ffffff"
            font.family: "sans-serif"
            font.pixelSize: parent.width * 0.13
            font.weight: Font.Bold
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter: parent.verticalCenter
            anchors.verticalCenterOffset: parent.width * 0.12
            text: label
            color: "#bac3c8"
            font.family: "sans-serif"
            font.pixelSize: parent.width * 0.035
            font.letterSpacing: 5
            font.weight: Font.Bold
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter: parent.verticalCenter
            anchors.verticalCenterOffset: parent.width * 0.19
            text: subLabel
            color: "#737f85"
            font.family: "sans-serif"
            font.pixelSize: parent.width * 0.032
            font.weight: Font.DemiBold
        }
    }
}

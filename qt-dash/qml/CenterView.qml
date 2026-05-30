import QtQuick
import QtQuick.Effects
import QtLocation
import QtPositioning
import QtQuick.VirtualKeyboard

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
    property var gps: safeState.gps || ({})
    property date clockTime: new Date()
    property color ambientColor: ambient.color || "#7ee3ff"
    property real ambientStrength: Math.max(0.18, Math.min(1, (ambient.brightness || 65) / 100))
    property int musicPosition: nowPlaying.positionSec || 0
    property int musicDuration: nowPlaying.durationSec || 0
    property int displayMusicPosition: Math.round(Math.max(0, Math.min(musicPosition, musicDuration > 0 ? musicDuration : musicPosition)))
    property real mediaProgress: Math.min(1, displayMusicPosition / Math.max(1, musicDuration))
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
    property bool launcherOpen: false
    property string activePage: "MEDIA"
    property string dialNumber: ""
    property string contactSearch: ""
    property url mediaWebUrl: ""
    readonly property real navLatitude: hasGpsLocation() ? Number(gps.lat) : 59.3293
    readonly property real navLongitude: hasGpsLocation() ? Number(gps.lng) : 18.0686

    function postBluetooth(path) {
        var request = new XMLHttpRequest();
        request.open("POST", "http://127.0.0.1:5175" + path);
        request.send();
    }

    function sendClimate(next) {
        vehicleClient.sendCommand("climate/set", next);
    }

    function mediaKey(title, artist, album) {
        return [title || "", artist || "", album || ""].join("\u001f");
    }

    function formatDuration(totalSeconds) {
        var safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        var minutes = Math.floor(safeSeconds / 60);
        var seconds = safeSeconds % 60;
        return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
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
            mediaSwapTimer.restart();
            return;
        }

        displayedArtwork = nextArtwork;
    }

    onNowPlayingChanged: queueMediaUpdate()

    function hasGpsLocation() {
        return Number.isFinite(Number(root.gps.lat)) && Number.isFinite(Number(root.gps.lng));
    }

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: root.clockTime = new Date()
    }

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
        }
    }

    Component.onCompleted: queueMediaUpdate()

    Plugin {
        id: mapPlugin
        name: "osm"
    }

    RouteQuery {
        id: navRouteQuery
        travelModes: RouteQuery.CarTravel
        routeOptimizations: RouteQuery.FastestRoute
        waypoints: [
            QtPositioning.coordinate(root.navLatitude, root.navLongitude),
            QtPositioning.coordinate(root.navLatitude + 0.018, root.navLongitude + 0.026)
        ]
    }

    RouteModel {
        id: navRouteModel
        plugin: mapPlugin
        query: navRouteQuery
        autoUpdate: true
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

    Item {
        id: contentRow
        anchors.fill: mainPanel
        anchors.margins: 24
        visible: root.activePage === "MEDIA"

        GlassPanel {
            id: mediaPanel
            anchors.fill: parent

            Row {
                anchors.fill: parent
                anchors.margins: 34
                spacing: 34

                Rectangle {
                    id: mediaArtwork
                    width: Math.min(parent.height, parent.width * 0.34)
                    height: width
                    anchors.verticalCenter: parent.verticalCenter
                    radius: 22
                    color: "#12191c"
                    clip: true

                    Image {
                        anchors.fill: parent
                        source: root.displayedArtwork || "file:///home/admin/digital-dash/public/albumcover.jpg"
                        fillMode: Image.PreserveAspectCrop
                        smooth: true
                        mipmap: true
                    }
                }

                Column {
                    width: parent.width - parent.spacing - mediaArtwork.width
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 18

                    Text {
                        text: root.nowPlaying.isPlaying ? "NOW PLAYING" : "MEDIA"
                        color: "#7b8591"
                        font.family: "sans-serif"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                        font.letterSpacing: 2
                    }

                    Text {
                        width: parent.width
                        elide: Text.ElideRight
                        maximumLineCount: 2
                        wrapMode: Text.WordWrap
                        text: root.displayedTitle || "Not Playing"
                        color: "#f4f7fb"
                        font.family: "sans-serif"
                        font.pixelSize: 44
                        font.weight: Font.Medium
                    }

                    Text {
                        width: parent.width
                        elide: Text.ElideRight
                        text: root.displayedArtist || root.displayedAlbum || "Bluetooth audio"
                        color: "#8b96a2"
                        font.family: "sans-serif"
                        font.pixelSize: 20
                    }

                    Rectangle {
                        width: parent.width
                        height: 6
                        radius: 3
                        color: Qt.rgba(1, 1, 1, 0.12)

                        Rectangle {
                            anchors.left: parent.left
                            anchors.top: parent.top
                            anchors.bottom: parent.bottom
                            width: parent.width * root.mediaProgress
                            radius: 3
                            color: "#c7c7c7"
                        }
                    }

                    Row {
                        width: parent.width
                        height: 18

                        Text {
                            anchors.left: parent.left
                            anchors.verticalCenter: parent.verticalCenter
                            text: root.formatDuration(root.displayMusicPosition)
                            color: "#8b96a2"
                            font.family: "sans-serif"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                        }

                        Text {
                            anchors.right: parent.right
                            anchors.verticalCenter: parent.verticalCenter
                            text: "-" + root.formatDuration(root.musicDuration - root.displayMusicPosition)
                            color: "#68777d"
                            font.family: "sans-serif"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                        }
                    }

                    Row {
                        anchors.horizontalCenter: parent.horizontalCenter
                        spacing: 10
                        PillButton {
                            iconSource: "file:///home/admin/digital-dash/public/recolored_C7C7C7/noun-backward-3751095.png"
                            iconSize: 28
                            width: 92
                            height: 52
                            onClicked: vehicleClient.sendCommand("bt/media/control", { "action": "prev" })
                        }
                        PillButton {
                            iconSource: root.nowPlaying.isPlaying ? "file:///home/admin/digital-dash/public/recolored_C7C7C7/noun-pause-3751099.png" : "file:///home/admin/digital-dash/public/recolored_C7C7C7/noun-play-3751096.png"
                            iconSize: 30
                            width: 104
                            height: 52
                            active: true
                            onClicked: vehicleClient.sendCommand("bt/media/control", { "action": root.nowPlaying.isPlaying ? "pause" : "play" })
                        }
                        PillButton {
                            iconSource: "file:///home/admin/digital-dash/public/recolored_C7C7C7/noun-forward-3751113.png"
                            iconSize: 28
                            width: 92
                            height: 52
                            onClicked: vehicleClient.sendCommand("bt/media/control", { "action": "next" })
                        }
                    }

                    Row {
                        anchors.horizontalCenter: parent.horizontalCenter
                        spacing: 10

                        PillButton {
                            label: "SPOTIFY"
                            width: 112
                            active: root.mediaWebUrl.toString().indexOf("spotify") !== -1
                            onClicked: root.mediaWebUrl = "https://open.spotify.com"
                        }

                        PillButton {
                            label: "YOUTUBE MUSIC"
                            width: 154
                            active: root.mediaWebUrl.toString().indexOf("music.youtube.com") !== -1
                            onClicked: root.mediaWebUrl = "https://music.youtube.com"
                        }

                        PillButton {
                            label: "PI YTM"
                            width: 90
                            active: root.mediaWebUrl.toString().indexOf("127.0.0.1:5174") !== -1
                            onClicked: root.mediaWebUrl = "http://127.0.0.1:5174"
                        }
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
        visible: root.activePage === "NAVIGATION"

        Rectangle {
            anchors.fill: parent
            radius: mainPanel.radius
            color: "#0f0f11"
            clip: true
        }

        Map {
            id: navigationMap
            anchors.fill: parent
            anchors.margins: 1
            plugin: mapPlugin
            center: QtPositioning.coordinate(root.navLatitude, root.navLongitude)
            zoomLevel: 15.6
            tilt: 45
            bearing: Number(root.gps.heading || 0)
            copyrightsVisible: false

            gesture.enabled: true
            gesture.acceptedGestures: MapGestureArea.PanGesture
                                      | MapGestureArea.FlickGesture
                                      | MapGestureArea.PinchGesture

            onCenterChanged: {
                if (root.activePage !== "NAVIGATION") {
                    return;
                }
            }

            MapItemView {
                model: navRouteModel

                delegate: MapRoute {
                    route: routeData
                    line.width: 9
                    line.color: "#00e5ff"
                    opacity: 0.92
                }
            }

            MapQuickItem {
                id: vehicleMarker
                coordinate: QtPositioning.coordinate(root.navLatitude, root.navLongitude)
                anchorPoint.x: vehicleCursor.width / 2
                anchorPoint.y: vehicleCursor.height / 2
                zoomLevel: 0
                z: 100

                sourceItem: Item {
                    id: vehicleCursor
                    width: 70
                    height: 70
                    rotation: Number(root.gps.heading || navigationMap.bearing)

                    Canvas {
                        anchors.fill: parent
                        antialiasing: true

                        onPaint: {
                            var ctx = getContext("2d");
                            ctx.reset();

                            var cx = width / 2;
                            var cy = height / 2;
                            var g = ctx.createLinearGradient(cx, 4, cx, height - 8);
                            g.addColorStop(0, "#ffffff");
                            g.addColorStop(0.45, "#00e5ff");
                            g.addColorStop(1, "#006f7f");

                            ctx.shadowColor = "#00e5ff";
                            ctx.shadowBlur = 22;
                            ctx.beginPath();
                            ctx.moveTo(cx, 5);
                            ctx.lineTo(width - 13, height - 9);
                            ctx.quadraticCurveTo(cx, height - 24, 13, height - 9);
                            ctx.closePath();
                            ctx.fillStyle = g;
                            ctx.fill();

                            ctx.shadowBlur = 0;
                            ctx.lineWidth = 2;
                            ctx.strokeStyle = "#e5fbff";
                            ctx.stroke();

                            ctx.beginPath();
                            ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2);
                            ctx.fillStyle = "rgba(15, 15, 17, 0.52)";
                            ctx.fill();
                        }
                    }
                }
            }
        }

        Rectangle {
            id: navSidePanel
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            width: 318
            radius: 26
            color: Qt.rgba(15 / 255, 17 / 255, 20 / 255, 0.86)
            border.color: Qt.rgba(126 / 255, 227 / 255, 255 / 255, 0.16)
            border.width: 1
            z: 20

            Column {
                anchors.fill: parent
                anchors.margins: 22
                spacing: 16

                Rectangle {
                    width: parent.width
                    height: 56
                    radius: 14
                    color: Qt.rgba(1, 1, 1, 0.075)
                    border.color: Qt.rgba(126 / 255, 227 / 255, 255 / 255, 0.18)
                    border.width: 1

                    Row {
                        anchors.fill: parent
                        anchors.leftMargin: 16
                        anchors.rightMargin: 14
                        spacing: 12

                        Text {
                            anchors.verticalCenter: parent.verticalCenter
                            text: "GO"
                            color: "#00e5ff"
                            font.family: "sans-serif"
                            font.pixelSize: 15
                            font.weight: Font.Bold
                        }

                        TextInput {
                            id: navSearchInput
                            width: parent.width - 58
                            anchors.verticalCenter: parent.verticalCenter
                            color: "#f4f7fb"
                            selectionColor: "#00e5ff"
                            font.family: "sans-serif"
                            font.pixelSize: 16
                            clip: true
                        }
                    }

                    Text {
                        anchors.left: parent.left
                        anchors.leftMargin: 52
                        anchors.verticalCenter: parent.verticalCenter
                        visible: navSearchInput.text.length === 0
                        text: "Navigate to destination"
                        color: "#75818c"
                        font.family: "sans-serif"
                        font.pixelSize: 15
                    }
                }

                Rectangle {
                    width: parent.width
                    height: 150
                    radius: 18
                    color: Qt.rgba(1, 1, 1, 0.065)
                    border.color: Qt.rgba(1, 1, 1, 0.09)
                    border.width: 1

                    Column {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 12

                        Text {
                            text: "CURRENT TRIP"
                            color: "#7b8591"
                            font.family: "sans-serif"
                            font.pixelSize: 12
                            font.weight: Font.Bold
                            font.letterSpacing: 1.8
                        }

                        Row {
                            width: parent.width
                            spacing: 18

                            Column {
                                width: (parent.width - parent.spacing) / 2
                                spacing: 4
                                Text { text: "ETA"; color: "#8b96a2"; font.pixelSize: 12; font.weight: Font.DemiBold }
                                Text { text: "18:42"; color: "#f4f7fb"; font.pixelSize: 28; font.weight: Font.Medium }
                            }

                            Column {
                                width: (parent.width - parent.spacing) / 2
                                spacing: 4
                                Text { text: "Distance"; color: "#8b96a2"; font.pixelSize: 12; font.weight: Font.DemiBold }
                                Text { text: "8.4 km"; color: "#f4f7fb"; font.pixelSize: 28; font.weight: Font.Medium }
                            }
                        }

                        ProgressBar {
                            width: parent.width
                            value: 0.42
                        }
                    }
                }

                Rectangle {
                    width: parent.width
                    height: 118
                    radius: 18
                    color: Qt.rgba(1, 1, 1, 0.065)
                    border.color: Qt.rgba(1, 1, 1, 0.09)
                    border.width: 1

                    Row {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 16

                        Column {
                            anchors.verticalCenter: parent.verticalCenter
                            width: parent.width - 136
                            spacing: 3

                            Text { text: "CABIN"; color: "#8b96a2"; font.pixelSize: 12; font.weight: Font.DemiBold; font.letterSpacing: 1.2 }
                            Text { text: Math.round(root.climate.tempSetC || 0) + " C"; color: "#f4f7fb"; font.pixelSize: 36; font.weight: Font.Light }
                        }

                        RoundButton { label: "-"; width: 50; height: 50; onClicked: root.sendClimate({ "tempSetC": (root.climate.tempSetC || 0) - 1 }) }
                        RoundButton { label: "+"; width: 50; height: 50; onClicked: root.sendClimate({ "tempSetC": (root.climate.tempSetC || 0) + 1 }) }
                    }
                }

                Item { width: 1; height: 1 }

                Rectangle {
                    width: parent.width
                    height: 46
                    radius: 13
                    color: root.hasGpsLocation() ? Qt.rgba(0, 229 / 255, 1, 0.10) : Qt.rgba(255 / 255, 91 / 255, 91 / 255, 0.13)
                    border.color: root.hasGpsLocation() ? Qt.rgba(0, 229 / 255, 1, 0.26) : Qt.rgba(255 / 255, 91 / 255, 91 / 255, 0.35)
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: root.hasGpsLocation()
                              ? Number(root.gps.lat).toFixed(5) + ", " + Number(root.gps.lng).toFixed(5)
                              : "NO GPS IN STATE"
                        color: root.hasGpsLocation() ? "#dff5ff" : "#ffb3b3"
                        font.family: "sans-serif"
                        font.pixelSize: 12
                        font.weight: Font.Bold
                        font.letterSpacing: 0.8
                    }
                }
            }
        }

        Rectangle {
            id: floatingNavSearch
            x: navSidePanel.width + 22
            y: 22
            width: 360
            height: 58
            radius: 16
            color: Qt.rgba(15 / 255, 17 / 255, 20 / 255, 0.86)
            border.color: Qt.rgba(126 / 255, 227 / 255, 255 / 255, 0.16)
            border.width: 1
            z: 22

            Row {
                anchors.fill: parent
                anchors.leftMargin: 18
                anchors.rightMargin: 18
                spacing: 12

                Text { anchors.verticalCenter: parent.verticalCenter; text: "GO"; color: "#00e5ff"; font.pixelSize: 15; font.weight: Font.Bold }
                Text { anchors.verticalCenter: parent.verticalCenter; width: parent.width - 72; text: "Search maps"; color: "#f4f7fb"; opacity: 0.88; font.pixelSize: 16; elide: Text.ElideRight }
                Text { anchors.verticalCenter: parent.verticalCenter; text: "OK"; color: "#7b8591"; font.pixelSize: 13; font.weight: Font.Bold }
            }
        }

        Column {
            anchors.right: parent.right
            anchors.rightMargin: 18
            anchors.verticalCenter: parent.verticalCenter
            spacing: 10
            z: 22

            PillButton { width: 54; height: 54; label: "+"; active: true; onClicked: navigationMap.zoomLevel = Math.min(navigationMap.maximumZoomLevel, navigationMap.zoomLevel + 1) }
            PillButton { width: 54; height: 54; label: "-"; onClicked: navigationMap.zoomLevel = Math.max(navigationMap.minimumZoomLevel, navigationMap.zoomLevel - 1) }
            PillButton { width: 54; height: 54; label: "T+"; onClicked: navigationMap.tilt = Math.min(65, navigationMap.tilt + 5) }
            PillButton { width: 54; height: 54; label: "T-"; onClicked: navigationMap.tilt = Math.max(0, navigationMap.tilt - 5) }
            PillButton {
                width: 54
                height: 54
                label: "GPS"
                active: true
                onClicked: navigationMap.center = QtPositioning.coordinate(root.navLatitude, root.navLongitude)
            }
        }
    }

    InputPanel {
        id: virtualKeyboard
        z: 100
        x: 0
        y: root.height
        width: root.width
        visible: active

        states: State {
            name: "visible"
            when: virtualKeyboard.active
            PropertyChanges {
                target: virtualKeyboard
                y: root.height - virtualKeyboard.height
            }
        }

        transitions: Transition {
            NumberAnimation {
                properties: "y"
                duration: 140
                easing.type: Easing.OutCubic
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
            id: bottomMusicPlayer
            anchors.centerIn: parent
            height: 44
            spacing: 12

            Rectangle {
                width: 42
                height: 42
                anchors.verticalCenter: parent.verticalCenter
                radius: 10
                color: "#12191c"
                clip: true

                Image {
                    anchors.fill: parent
                    source: root.displayedArtwork || "file:///home/admin/digital-dash/public/albumcover.jpg"
                    fillMode: Image.PreserveAspectCrop
                }
            }

            Column {
                anchors.verticalCenter: parent.verticalCenter
                width: 190
                spacing: 2

                Text {
                    width: parent.width
                    elide: Text.ElideRight
                    text: root.displayedTitle || "Not Playing"
                    color: "#f4f7fb"
                    font.family: "sans-serif"
                    font.pixelSize: 14
                    font.weight: Font.Medium
                }

                Text {
                    width: parent.width
                    elide: Text.ElideRight
                    text: root.displayedArtist || root.displayedAlbum || "-"
                    color: "#8b96a2"
                    font.family: "sans-serif"
                    font.pixelSize: 11
                }
            }

            DockButton {
                anchors.verticalCenter: parent.verticalCenter
                backgroundVisible: false
                iconSource: root.nowPlaying.isPlaying ? "file:///home/admin/digital-dash/public/recolored_C7C7C7/noun-pause-3751099.png" : "file:///home/admin/digital-dash/public/recolored_C7C7C7/noun-play-3751096.png"
                iconSize: 24
                width: 42
                onClicked: vehicleClient.sendCommand("bt/media/control", { "action": root.nowPlaying.isPlaying ? "pause" : "play" })
            }
        }

        DockButton {
            anchors.left: parent.left
            anchors.leftMargin: 30
            anchors.verticalCenter: parent.verticalCenter
            iconSource: "file:///home/admin/digital-dash/public/application.png"
            iconSize: 22
            width: 44
            onClicked: root.launcherOpen = !root.launcherOpen
        }

        DockButton {
            anchors.right: parent.right
            anchors.rightMargin: 30
            anchors.verticalCenter: parent.verticalCenter
            label: Math.round(root.climate.tempSetC || 0) + " C"
            width: 96
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

            LauncherTile { label: "MEDIA"; iconSource: "file:///home/admin/digital-dash/public/Cluster%20and%20headunit%20icons/headunit/noun-play-icon-3523397.png"; active: root.activePage === "MEDIA"; onClicked: { root.activePage = "MEDIA"; root.launcherOpen = false } }
            LauncherTile { label: "CLIMATE"; iconSource: "file:///home/admin/digital-dash/public/Cluster%20and%20headunit%20icons/headunit/noun-temperature-4701938.png"; active: root.activePage === "CLIMATE"; onClicked: { root.activePage = "CLIMATE"; root.launcherOpen = false } }
            LauncherTile { label: "CAR"; iconSource: "file:///home/admin/digital-dash/public/Cluster%20and%20headunit%20icons/headunit/noun-car-2441109.png"; active: root.activePage === "CAR"; onClicked: { root.activePage = "CAR"; root.launcherOpen = false } }
            LauncherTile { label: "NAVIGATION"; iconSource: "file:///home/admin/digital-dash/public/Cluster%20and%20headunit%20icons/headunit/noun-navigation-5603242.png"; active: root.activePage === "NAVIGATION"; onClicked: { root.activePage = "NAVIGATION"; root.launcherOpen = false } }
            LauncherTile { label: "PHONE"; iconSource: "file:///home/admin/digital-dash/public/Cluster%20and%20headunit%20icons/headunit/noun-phone-8365903.png"; active: root.activePage === "PHONE"; onClicked: { root.activePage = "PHONE"; root.launcherOpen = false } }
            LauncherTile { label: "SETTINGS"; iconSource: "file:///home/admin/digital-dash/public/Cluster%20and%20headunit%20icons/headunit/noun-setting-7376103.png"; active: root.activePage === "SETTINGS"; onClicked: { root.activePage = "SETTINGS"; root.launcherOpen = false } }
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
        property string iconSource: ""
        property real iconSize: 18
        property bool backgroundVisible: true

        height: 42
        radius: 12
        color: backgroundVisible ? Qt.rgba(1, 1, 1, 0.07) : "transparent"

        Image {
            id: dockIcon
            anchors.centerIn: parent
            width: iconSize
            height: iconSize
            visible: iconSource.length > 0
            source: iconSource
            fillMode: Image.PreserveAspectFit
            smooth: true
            mipmap: true
            sourceSize.width: iconSize * 4
            sourceSize.height: iconSize * 4
        }

        Text {
            anchors.centerIn: parent
            visible: iconSource.length === 0
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
        property string iconSource: ""
        property real iconSize: 18
        property real iconRotation: 0
        property bool active: false
        property color activeColor: "#7ee3ff"

        width: 120
        height: 42
        radius: 12
        color: active ? Qt.rgba(activeColor.r, activeColor.g, activeColor.b, 0.16) : Qt.rgba(1, 1, 1, 0.06)
        border.color: active ? activeColor : Qt.rgba(1, 1, 1, 0.10)
        border.width: 1

        Image {
            id: pillIcon
            anchors.centerIn: parent
            width: iconSize
            height: iconSize
            visible: iconSource.length > 0
            source: iconSource
            fillMode: Image.PreserveAspectFit
            rotation: iconRotation
            smooth: true
            mipmap: true
            sourceSize.width: iconSize * 4
            sourceSize.height: iconSize * 4
        }

        Text {
            anchors.centerIn: parent
            visible: iconSource.length === 0
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
        property string iconSource: ""
        property bool active: false

        width: 148
        height: 168
        radius: 14
        color: active ? Qt.rgba(1, 1, 1, 0.14) : Qt.rgba(1, 1, 1, 0.065)
        border.color: active ? Qt.rgba(1, 1, 1, 0.16) : Qt.rgba(1, 1, 1, 0.045)
        border.width: 1

        Image {
            x: Math.round((parent.width - width) / 2)
            y: 36
            width: 64
            height: 64
            visible: iconSource.length > 0
            source: iconSource
            fillMode: Image.PreserveAspectFit
            smooth: true
            mipmap: true
            sourceSize.width: 64
            sourceSize.height: 64
            opacity: active ? 1.0 : 0.72
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 12
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

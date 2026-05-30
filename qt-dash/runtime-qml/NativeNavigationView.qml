import QtQuick
import QtLocation
import QtPositioning

Item {
    id: root

    signal climateSetRequested(var next)

    property var gps: ({})
    property var climate: ({})
    readonly property real navLatitude: hasGpsLocation() ? Number(gps.lat) : 59.3293
    readonly property real navLongitude: hasGpsLocation() ? Number(gps.lng) : 18.0686

    function hasGpsLocation() {
        return Number.isFinite(Number(root.gps.lat)) && Number.isFinite(Number(root.gps.lng));
    }

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
        radius: 28
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
                        ctx.arc(cx, height / 2 + 10, 6, 0, Math.PI * 2);
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

                    Rectangle {
                        width: parent.width
                        height: 5
                        radius: 3
                        color: "#202832"

                        Rectangle {
                            height: parent.height
                            radius: parent.radius
                            color: "#f4f7fb"
                            width: parent.width * 0.42
                        }
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

                    NavButton {
                        label: "-"
                        width: 50
                        height: 50
                        round: true
                        onClicked: root.climateSetRequested({ "tempSetC": (root.climate.tempSetC || 0) - 1 })
                    }

                    NavButton {
                        label: "+"
                        width: 50
                        height: 50
                        round: true
                        onClicked: root.climateSetRequested({ "tempSetC": (root.climate.tempSetC || 0) + 1 })
                    }
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

        NavButton { width: 54; height: 54; label: "+"; active: true; onClicked: navigationMap.zoomLevel = Math.min(navigationMap.maximumZoomLevel, navigationMap.zoomLevel + 1) }
        NavButton { width: 54; height: 54; label: "-"; onClicked: navigationMap.zoomLevel = Math.max(navigationMap.minimumZoomLevel, navigationMap.zoomLevel - 1) }
        NavButton { width: 54; height: 54; label: "T+"; onClicked: navigationMap.tilt = Math.min(65, navigationMap.tilt + 5) }
        NavButton { width: 54; height: 54; label: "T-"; onClicked: navigationMap.tilt = Math.max(0, navigationMap.tilt - 5) }
        NavButton {
            width: 54
            height: 54
            label: "GPS"
            active: true
            onClicked: navigationMap.center = QtPositioning.coordinate(root.navLatitude, root.navLongitude)
        }
    }

    component NavButton: Rectangle {
        signal clicked()
        property string label: ""
        property bool active: false
        property bool round: false

        radius: round ? width / 2 : 12
        color: active ? Qt.rgba(126 / 255, 227 / 255, 255 / 255, 0.16) : Qt.rgba(1, 1, 1, 0.06)
        border.color: active ? "#7ee3ff" : Qt.rgba(1, 1, 1, 0.10)
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: label
            color: active ? "#f4f7fb" : "#a6b0b7"
            font.family: "sans-serif"
            font.pixelSize: label.length > 1 ? 12 : 22
            font.weight: Font.DemiBold
        }

        MouseArea {
            anchors.fill: parent
            onClicked: parent.clicked()
        }
    }
}

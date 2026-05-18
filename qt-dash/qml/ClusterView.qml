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
    property var gps: safeState.gps || ({})

    property real rpm: engine.rpm || 0
    property real speed: vehicle.speedKmh || 0
    property real fuel: fuelState.percent || 0
    property real battery: electrical.batteryV || 0
    property real oilTemp: temp.oilC || 0
    property real coolantTemp: temp.coolantC || 0
    property int musicPosition: nowPlaying.positionSec || 0
    property int musicDuration: nowPlaying.durationSec || 0
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

    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: root.clockTime = new Date()
    }

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
            font.family: "Inter"
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

    Column {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: mediaCard.top
        anchors.bottomMargin: 6
        width: parent.width * 0.28
        spacing: 7

        BarMeter { label: "OIL"; value: root.oilTemp; minValue: 40; maxValue: 140; suffix: "C"; warn: root.oilTemp >= 110 }
        BarMeter { label: "COOLANT"; value: root.coolantTemp; minValue: 40; maxValue: 120; suffix: "C"; warn: root.coolantTemp >= 100 }
        BarMeter { label: "FUEL"; value: root.fuel; minValue: 0; maxValue: 100; suffix: "%"; warn: root.fuel <= 15 }
    }

    Rectangle {
        id: mediaCard
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: shell.bottom
        anchors.bottomMargin: 20
        width: parent.width * 0.43
        height: 78
        radius: 18
        color: "#10191c"
        opacity: 0.96
        border.color: "#203238"
        border.width: 1

        Rectangle {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            anchors.leftMargin: 14
            width: 52
            height: 52
            radius: 13
            color: "#213338"
            border.color: "#3a565d"

            Text {
                anchors.centerIn: parent
                text: "M"
                color: "#b9cbd1"
                font.pixelSize: 28
                font.weight: Font.Bold
            }
        }

        Column {
            anchors.left: parent.left
            anchors.leftMargin: 82
            anchors.verticalCenter: parent.verticalCenter
            width: parent.width * 0.34
            spacing: 3

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: root.nowPlaying.title || "No media playing"
                color: "#ffffff"
                font.family: "Inter"
                font.pixelSize: 18
                font.weight: Font.Bold
            }

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: root.nowPlaying.artist || ""
                color: "#94a2a8"
                font.family: "Inter"
                font.pixelSize: 13
            }

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: root.nowPlaying.album || ""
                color: "#647278"
                font.family: "Inter"
                font.pixelSize: 10
                font.letterSpacing: 3
            }
        }

        Row {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top
            anchors.topMargin: 14
            spacing: 9

            MediaButton { label: "<<"; onClicked: root.mediaControl("prev") }
            MediaButton { label: root.nowPlaying.isPlaying ? "||" : ">"; primary: true; onClicked: root.mediaControl(root.nowPlaying.isPlaying ? "pause" : "play") }
            MediaButton { label: ">>"; onClicked: root.mediaControl("next") }
        }

        Rectangle {
            anchors.left: parent.left
            anchors.leftMargin: parent.width * 0.48
            anchors.right: parent.right
            anchors.rightMargin: 16
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 24
            height: 4
            radius: 2
            color: "#263236"

            Rectangle {
                width: parent.width * root.clamp(root.musicPosition / Math.max(1, root.musicDuration), 0, 1)
                height: parent.height
                radius: parent.radius
                color: "#c9eee1"
            }
        }

        Text {
            anchors.left: parent.left
            anchors.leftMargin: parent.width * 0.48
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 8
            text: root.formatDuration(root.musicPosition)
            color: "#8d9aa0"
            font.pixelSize: 11
        }

        Text {
            anchors.right: parent.right
            anchors.rightMargin: 16
            anchors.bottom: parent.bottom
            anchors.bottomMargin: 8
            text: "-" + root.formatDuration(root.musicDuration - root.musicPosition)
            color: "#8d9aa0"
            font.pixelSize: 11
        }
    }

    Text {
        anchors.right: shell.right
        anchors.bottom: shell.bottom
        anchors.rightMargin: 42
        anchors.bottomMargin: 24
        text: "180000 km"
        color: "#455259"
        font.family: "Inter"
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
                font.family: "Inter"
                font.pixelSize: 10
                font.weight: Font.DemiBold
            }

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: value
                color: accent
                font.family: "Inter"
                font.pixelSize: 22
                font.weight: Font.Bold
            }

            Text {
                width: parent.width
                elide: Text.ElideRight
                text: detail
                color: "#748087"
                font.family: "Inter"
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
            font.family: "Inter"
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
            font.family: "Inter"
            font.pixelSize: 10
            font.weight: Font.Bold
        }

        Text {
            anchors.right: parent.right
            text: Math.round(value) + suffix
            color: warn ? "#ffd166" : "#ffffff"
            font.family: "Inter"
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

        Behavior on displayValue {
            NumberAnimation { duration: 180; easing.type: Easing.OutCubic }
        }

        onValueChanged: displayValue = value

        Canvas {
            id: gaugeCanvas
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
                var pct = clampValue(displayValue / Math.max(1, maximumValue), 0, 1);
                var liveColor = displayValue >= dangerAt ? warnColor : accentColor;
                var trackInset = size * 0.095;
                var fullTrack = buildSquircleSamples(size, trackInset, power, fullStart, fullSweep, 260);
                var activeTrack = buildSquircleSamples(size, trackInset, power, fullStart, scaleSweep, 210);
                var innerFrame = buildSquircleSamples(size, size * 0.255, power, fullStart, fullSweep, 220);
                var tickOuter = buildSquircleSamples(size, size * 0.057, power, fullStart, fullSweep, 260);
                var tickInnerMajor = buildSquircleSamples(size, size * 0.155, power, fullStart, fullSweep, 260);
                var tickInnerMinor = buildSquircleSamples(size, size * 0.125, power, fullStart, fullSweep, 260);
                var labelTrack = buildSquircleSamples(size, size * 0.062, power, fullStart, scaleSweep, 210);

                ctx.reset();
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.translate(xOffset, yOffset);

                ctx.shadowColor = rgbaString(liveColor, 1);
                ctx.shadowBlur = size * 0.055;
                ctx.lineWidth = Math.max(28, size * 0.088);
                ctx.strokeStyle = rgbaString(liveColor, 0.11);
                ctx.beginPath();
                drawSamples(ctx, activeTrack, 1, false);
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.lineWidth = Math.max(21, size * 0.061);
                ctx.strokeStyle = "rgba(255,255,255,0.045)";
                ctx.beginPath();
                drawSamples(ctx, activeTrack, 1, false);
                ctx.stroke();

                ctx.lineWidth = Math.max(6, size * 0.018);
                ctx.strokeStyle = "rgba(255,255,255,0.13)";
                ctx.beginPath();
                drawSamples(ctx, activeTrack, 1, false);
                ctx.stroke();

                ctx.shadowColor = rgbaString(liveColor, 1);
                ctx.shadowBlur = size * 0.04;
                ctx.lineWidth = Math.max(18, size * 0.048);
                ctx.strokeStyle = rgbaString(liveColor, 0.30);
                ctx.beginPath();
                drawSamples(ctx, activeTrack, pct, false);
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.lineWidth = Math.max(9, size * 0.026);
                ctx.strokeStyle = rgbaString(liveColor, 1);
                ctx.beginPath();
                drawSamples(ctx, activeTrack, pct, false);
                ctx.stroke();

                ctx.lineWidth = Math.max(2, size * 0.006);
                ctx.strokeStyle = "rgba(255,255,255,0.72)";
                ctx.beginPath();
                drawSamples(ctx, activeTrack, pct, false);
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
                    ctx.font = "bold 15px Inter";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    var shown = maximumValue > 1000 ? Math.round(labelValue / 1000).toString() : Math.round(labelValue).toString();
                    ctx.fillText(shown, labelPoint.x, labelPoint.y);
                }
            }

            Connections {
                target: gaugeRoot
                function onDisplayValueChanged() { gaugeCanvas.requestPaint(); }
                function onDangerAtChanged() { gaugeCanvas.requestPaint(); }
                function onReverseChanged() { gaugeCanvas.requestPaint(); }
                function onAccentColorChanged() { gaugeCanvas.requestPaint(); }
                function onWarnColorChanged() { gaugeCanvas.requestPaint(); }
                function onMaximumValueChanged() { gaugeCanvas.requestPaint(); }
                function onMajorStepChanged() { gaugeCanvas.requestPaint(); }
                function onWidthChanged() { gaugeCanvas.requestPaint(); }
                function onHeightChanged() { gaugeCanvas.requestPaint(); }
            }

            Component.onCompleted: requestPaint()
        }

        Text {
            anchors.centerIn: parent
            anchors.verticalCenterOffset: -8
            text: valueText
            color: "#ffffff"
            font.family: "Inter"
            font.pixelSize: parent.width * 0.13
            font.weight: Font.Bold
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter: parent.verticalCenter
            anchors.verticalCenterOffset: parent.width * 0.12
            text: label
            color: "#bac3c8"
            font.family: "Inter"
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
            font.family: "Inter"
            font.pixelSize: parent.width * 0.032
            font.weight: Font.DemiBold
        }
    }
}

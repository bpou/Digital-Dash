import QtQuick

Item {
    id: root

    property real value: 0
    property real maximumValue: 100
    property string label: ""
    property string valueText: ""
    property color accentColor: "#e8eef5"

    // Warning zones: array of objects with min, max, color
    // Example: [{ min: 0, max: 4000, color: "#22c55e" }, { min: 4000, max: 6000, color: "#eab308" }, { min: 6000, max: 8000, color: "#ef4444" }]
    property var zones: []

    property real displayValue: value

    Behavior on displayValue {
        NumberAnimation {
            duration: 220
            easing.type: Easing.OutCubic
        }
    }

    onValueChanged: displayValue = value

    Canvas {
        id: canvas
        anchors.fill: parent
        antialiasing: true

        onPaint: {
            var ctx = getContext("2d");
            var w = width;
            var h = height;
            var cx = w / 2;
            var cy = h / 2;
            var r = Math.min(w, h) * 0.39;

            var start = -Math.PI * 0.5;
            var fullSweep = Math.PI * 2;
            var pct = Math.max(0, Math.min(1, root.displayValue / Math.max(1, root.maximumValue)));

            ctx.reset();
            ctx.lineCap = "round";

            // --- Outer shadow / depth ---
            ctx.lineWidth = 16;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
            ctx.beginPath();
            ctx.arc(cx, cy, r + 2, 0, fullSweep);
            ctx.stroke();

            // --- Concentric ring: outer decorative ---
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
            ctx.beginPath();
            ctx.arc(cx, cy, r + 10, 0, fullSweep);
            ctx.stroke();

            // --- Concentric ring: inner decorative ---
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.arc(cx, cy, r - 14, 0, fullSweep);
            ctx.stroke();

            // --- Background arc ---
            ctx.lineWidth = 9;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.075)";
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + fullSweep);
            ctx.stroke();

            // --- Warning zone arcs (background colored bands) ---
            if (zones.length > 0) {
                for (var zi = 0; zi < zones.length; zi++) {
                    var zone = zones[zi];
                    var zStart = start + (zone.min / root.maximumValue) * fullSweep;
                    var zSweep = ((zone.max - zone.min) / root.maximumValue) * fullSweep;

                    ctx.lineWidth = 9;
                    ctx.strokeStyle = zone.color;
                    ctx.globalAlpha = 0.18;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, zStart, zStart + zSweep);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }

            // --- Progress glow ---
            ctx.lineWidth = 14;
            ctx.strokeStyle = root.accentColor;
            ctx.globalAlpha = 0.16;
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + fullSweep * pct);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // --- Progress arc ---
            ctx.lineWidth = 8;
            ctx.strokeStyle = root.accentColor;
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + fullSweep * pct);
            ctx.stroke();

            // --- Bright core on arc ---
            ctx.lineWidth = Math.max(2, 8 * 0.25);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + fullSweep * pct);
            ctx.stroke();

            // --- Subtle inner arc ---
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.arc(cx, cy, r - 16, start, start + fullSweep);
            ctx.stroke();

            // --- Tick marks ---
            var tickCount = 40;
            for (var i = 0; i <= tickCount; i++) {
                var a = start + fullSweep * (i / tickCount);
                var isMajor = i % 10 === 0;
                var innerR = isMajor ? r - 22 : r - 16;
                var outerR = r - 4;

                ctx.lineWidth = isMajor ? 2.2 : 1.0;
                ctx.strokeStyle = isMajor ? "rgba(225, 232, 240, 0.45)" : "rgba(225, 232, 240, 0.18)";
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
                ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
                ctx.stroke();
            }

            // --- Needle indicator ---
            if (pct > 0.005) {
                var needleAngle = start + fullSweep * pct;
                var needleLen = r - 22;
                var tipX = cx + Math.cos(needleAngle) * needleLen;
                var tipY = cy + Math.sin(needleAngle) * needleLen;

                // Shadow
                ctx.lineWidth = 5;
                ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();

                // Needle line
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = "#ef4444";
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();

                // Bright core
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = "rgba(255, 200, 200, 0.55)";
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();

                // Needle tip dot
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // --- Endpoint dot ---
            if (pct > 0.015) {
                var endA = start + fullSweep * pct;
                var ex = cx + Math.cos(endA) * r;
                var ey = cy + Math.sin(endA) * r;

                ctx.fillStyle = root.accentColor;
                ctx.beginPath();
                ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // --- Center hub ---
            ctx.fillStyle = "rgba(20, 25, 30, 0.9)";
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = root.accentColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();

            // --- Cross-hair guides ---
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";

            ctx.beginPath();
            ctx.moveTo(cx, cy - r + 4);
            ctx.lineTo(cx, cy - r + 20);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx, cy + r - 20);
            ctx.lineTo(cx, cy + r - 4);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx - r + 4, cy);
            ctx.lineTo(cx - r + 20, cy);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx + r - 20, cy);
            ctx.lineTo(cx + r - 4, cy);
            ctx.stroke();
        }

        Connections {
            target: root
            function onDisplayValueChanged() { canvas.requestPaint(); }
            function onMaximumValueChanged() { canvas.requestPaint(); }
            function onAccentColorChanged() { canvas.requestPaint(); }
            function onZonesChanged() { canvas.requestPaint(); }
            function onWidthChanged() { canvas.requestPaint(); }
            function onHeightChanged() { canvas.requestPaint(); }
        }

        Component.onCompleted: canvas.requestPaint()
    }

    Text {
        id: valueTextItem
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.verticalCenter: parent.verticalCenter
        anchors.verticalCenterOffset: -6

        text: root.valueText
        color: "#f5f7fa"
        font.family: "Inter"
        font.pixelSize: Math.max(34, parent.width * 0.17)
        font.weight: Font.ExtraLight
    }

    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.top: valueTextItem.bottom
        anchors.topMargin: 0

        text: root.label
        color: "#7f8a96"
        font.family: "Inter"
        font.pixelSize: 14
        font.letterSpacing: 2
        font.weight: Font.DemiBold
    }
}
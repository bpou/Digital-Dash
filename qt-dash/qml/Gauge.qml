import QtQuick

Item {
    id: root

    property real value: 0
    property real maximumValue: 100
    property string label: ""
    property string valueText: ""
    property color accentColor: "#e8eef5"

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
            const ctx = getContext("2d");
            const w = width;
            const h = height;
            const cx = w / 2;
            const cy = h / 2 + h * 0.03;
            const r = Math.min(w, h) * 0.39;

            const start = Math.PI * 0.78;
            const sweep = Math.PI * 1.44;
            const pct = Math.max(0, Math.min(1, root.displayValue / Math.max(1, root.maximumValue)));

            ctx.reset();
            ctx.lineCap = "round";

            // outer shadow / soft depth
            ctx.lineWidth = 16;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
            ctx.beginPath();
            ctx.arc(cx, cy, r + 1, start, start + sweep);
            ctx.stroke();

            // background arc
            ctx.lineWidth = 9;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.075)";
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + sweep);
            ctx.stroke();

            // subtle inner arc
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.beginPath();
            ctx.arc(cx, cy, r - 16, start, start + sweep);
            ctx.stroke();

            // tick marks
            for (let i = 0; i <= 20; i++) {
                const a = start + sweep * (i / 20);
                const major = i % 5 === 0;
                const inner = r - (major ? 24 : 18);
                const outer = r - 5;

                ctx.lineWidth = major ? 2.2 : 1.2;
                ctx.strokeStyle = major
                    ? "rgba(225, 232, 240, 0.42)"
                    : "rgba(225, 232, 240, 0.18)";

                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
                ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
                ctx.stroke();
            }

            // progress glow
            ctx.lineWidth = 14;
            ctx.strokeStyle = Qt.rgba(root.accentColor.r, root.accentColor.g, root.accentColor.b, 0.16);
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + sweep * pct);
            ctx.stroke();

            // progress arc
            ctx.lineWidth = 8;
            ctx.strokeStyle = root.accentColor;
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + sweep * pct);
            ctx.stroke();

            // endpoint dot
            if (pct > 0.015) {
                const end = start + sweep * pct;
                const ex = cx + Math.cos(end) * r;
                const ey = cy + Math.sin(end) * r;

                ctx.fillStyle = root.accentColor;
                ctx.beginPath();
                ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        Connections {
            target: root
            function onDisplayValueChanged() { canvas.requestPaint(); }
            function onMaximumValueChanged() { canvas.requestPaint(); }
            function onAccentColorChanged() { canvas.requestPaint(); }
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
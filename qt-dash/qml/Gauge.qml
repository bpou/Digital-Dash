import QtQuick

Item {
    id: root
    property real value: 0
    property real maximumValue: 100
    property string label: ""
    property string valueText: ""
    property color accentColor: "#f4f7fb"

    Canvas {
        id: canvas
        anchors.fill: parent

        onPaint: {
            const ctx = getContext("2d");
            const w = width;
            const h = height;
            const cx = w / 2;
            const cy = h / 2;
            const r = Math.min(w, h) * 0.42;
            const start = Math.PI * 0.78;
            const sweep = Math.PI * 1.44;
            const pct = Math.max(0, Math.min(1, root.value / Math.max(1, root.maximumValue)));

            ctx.reset();
            ctx.lineCap = "round";
            ctx.lineWidth = 10;
            ctx.strokeStyle = "rgba(255,255,255,0.10)";
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + sweep);
            ctx.stroke();

            ctx.strokeStyle = root.accentColor;
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + sweep * pct);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255,255,255,0.20)";
            for (let i = 0; i <= 10; i++) {
                const a = start + sweep * (i / 10);
                const inner = r - 22;
                const outer = r - 4;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
                ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
                ctx.stroke();
            }
        }

        Connections {
            target: root
            function onValueChanged() { canvas.requestPaint(); }
            function onMaximumValueChanged() { canvas.requestPaint(); }
            function onAccentColorChanged() { canvas.requestPaint(); }
        }
    }

    Text {
        anchors.centerIn: parent
        text: root.valueText
        color: "#f4f7fb"
        font.family: "Inter"
        font.pixelSize: Math.max(36, parent.width * 0.18)
        font.weight: Font.Light
    }

    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.top: parent.verticalCenter
        anchors.topMargin: parent.height * 0.18
        text: root.label
        color: "#7b8591"
        font.family: "Inter"
        font.pixelSize: 15
        font.weight: Font.Medium
    }
}

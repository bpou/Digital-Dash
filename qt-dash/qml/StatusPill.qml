import QtQuick

Rectangle {
    id: root
    property string label: ""
    property string value: ""

    width: 170
    height: 56
    radius: 28
    color: "#121a22"
    border.color: "#2a3945"
    border.width: 1

    Row {
        anchors.centerIn: parent
        spacing: 10

        Text {
            text: root.label
            color: "#7f8d98"
            font.pixelSize: 12
            font.bold: true
        }

        Text {
            text: root.value
            color: "white"
            font.pixelSize: 16
            font.bold: true
        }
    }
}

import QtQuick

Rectangle {
    id: root
    property string label: ""
    property string value: ""
    property color accentColor: "#f4f7fb"

    width: 126
    height: 34
    radius: 6
    color: "#0d1014"
    border.color: "#202832"
    border.width: 1

    Row {
        anchors.centerIn: parent
        spacing: 7

        Text {
            text: root.label
            color: "#727d89"
            font.family: "sans-serif"
            font.pixelSize: 11
            font.weight: Font.DemiBold
        }

        Text {
            text: root.value
            color: root.accentColor
            font.family: "sans-serif"
            font.pixelSize: 13
            font.weight: Font.DemiBold
        }
    }
}

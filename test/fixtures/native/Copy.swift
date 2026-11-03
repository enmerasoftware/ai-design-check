import SwiftUI
struct Copy: View {
    var body: some View {
        Text("Oops, that did not work")
        Text("Loading...")
        Text("Our seamless sync")
        Text("Trusted by 10,000+ teams")
        Text("GET STARTED NOW")
        Text("Plan").textCase(.uppercase).tracking(2)
        Button("Submit") {}
        Button { close() } label: { Image(systemName: "xmark") }
        Button { close() } label: { Image(systemName: "xmark") }.accessibilityLabel("Close")
        Button { close() } label: { Label("Close", systemImage: "xmark") }
    }
}

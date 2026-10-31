import SwiftUI

// A vibecoded SwiftUI home screen: every line below is a finding unless marked "passes".
struct HomeView: View {
    var body: some View {
        VStack(spacing: 13) {
            Text("Good morning, Alex! 👋")
                .font(.system(size: 26, weight: .heavy))
            Text("Upcoming Payments")
                .font(.headline) // passes: text style
            Image(systemName: "sparkles")
                .font(.system(size: 18)) // passes: icon size
            Text("Saved")
                .padding(.horizontal, 16) // passes: on the grid
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 13).fill(LinearGradient(colors: [.purple, .blue], startPoint: .top, endPoint: .bottom)))
                .shadow(color: .black.opacity(0.3), radius: 24)
                .blur(radius: 30)
            Text("You did it!")
            Circle().animation(.easeInOut.repeatForever(), value: true)
        }
        .padding(2) // passes: hairline
        // Text("Ignored In A Comment!")
    }
}

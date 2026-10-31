package app

@Composable
fun Home() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(horizontal = 16.dp, vertical = 18.dp)) {
        Text("Welcome back, Alex! 🚀", fontSize = 26.sp, fontWeight = FontWeight.Black)
        Text(text = "Recent Activity")
        Icon(Icons.Filled.AutoAwesome, contentDescription = null)
        Card(shape = RoundedCornerShape(13.dp), elevation = 12.dp) {}
        Box(Modifier.background(Brush.linearGradient(listOf(Purple, Pink))))
    }
}

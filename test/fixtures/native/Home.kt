package app

@Composable
fun Home() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(horizontal = 16.dp, vertical = 18.dp)) {
        Text("Welcome back, Alex! 🚀", fontSize = 26.sp, fontWeight = FontWeight.Black)
        Text(text = "Recent Activity")
        Icon(Icons.Filled.AutoAwesome, contentDescription = null)
        Card(shape = RoundedCornerShape(13.dp), elevation = 12.dp) {}
        Box(Modifier.background(Brush.linearGradient(listOf(Purple, Pink))))
        Icon(Icons.Filled.Close, contentDescription = "Close", modifier = Modifier.size(24.dp).clickable { })
        IconButton(onClick = {}, modifier = Modifier.size(32.dp)) { Icon(Icons.Filled.Add, contentDescription = "Add") }
        IconButton(onClick = {}) { Icon(Icons.Filled.Add, contentDescription = "Add", modifier = Modifier.size(24.dp)) } // passes: 48 dp button
        Box(Modifier.size(8.dp)) // passes: not tappable
    }
}

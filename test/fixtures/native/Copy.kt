package app

@Composable
fun Copy() {
    Text("Oops, that did not work")
    Text("Loading...")
    Text("Our seamless sync")
    Text("Trusted by 10,000+ teams")
    Text("GET STARTED NOW")
    Text("Plan".uppercase(), letterSpacing = 2.sp)
    Button(onClick = {}) { Text("Submit") }
    IconButton(onClick = {}) { Icon(Icons.Filled.Close, contentDescription = null) }
    IconButton(onClick = {}) { Icon(Icons.Filled.Close, contentDescription = "Close") }
}

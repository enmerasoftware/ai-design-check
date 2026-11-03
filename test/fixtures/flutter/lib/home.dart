import 'package:flutter/material.dart';
// Comment that must not count: padding EdgeInsets.all(13) 'Oops'
class Home extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Column(spacing: 10, children: [
        Text('Recent Activity', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
        Text("Welcome back, Alex! 🚀"),
        Text('GET STARTED', style: TextStyle(letterSpacing: 2)),
        Text('Oops, something broke...'),
        Text('Passes: fine', textScaler: TextScaler.noScaling),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(7),
            gradient: const LinearGradient(colors: [Colors.deepPurple, Colors.pink]),
            boxShadow: [BoxShadow(blurRadius: 40)],
          ),
        ),
        Container(width: 44, height: 44, decoration: BoxDecoration(borderRadius: BorderRadius.circular(22))),
        Card(elevation: 12),
        Card(elevation: 2),
        IconButton(icon: const Icon(Icons.auto_awesome), onPressed: () {}),
        IconButton(tooltip: 'Close', icon: const Icon(Icons.close), onPressed: () {}),
        SizedBox(height: 30, child: ElevatedButton(onPressed: () {}, child: const Text('Save'))),
        GestureDetector(onTap: () {}, child: Container(height: 28)),
        TextButton(style: TextButton.styleFrom(tapTargetSize: MaterialTapTargetSize.shrinkWrap), onPressed: () {}, child: const Text('Submit')),
        BackdropFilter(filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40)),
      ]),
    );
  }
}
final curve = Curves.bounceOut;
void start(AnimationController c) => c.repeat();

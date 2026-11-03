import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
    return (
        <View style={{ padding: 13, gap: 8, borderRadius: 7 }}>
            <Text style={styles.title} allowFontScaling={false}>Recent Activity</Text>
            <Text style={{ fontSize: 10, letterSpacing: 2 }}>GET STARTED</Text>
            <TouchableOpacity style={styles.small}><Text>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.small} hitSlop={12}><Text>Passes: hit slop</Text></TouchableOpacity>
            <Pressable style={styles.tall}><Text>Passes: tall</Text></Pressable>
            <Pressable style={{ height: 30 }}><Ionicons name="close" /></Pressable>
            <Pressable accessibilityLabel="Close" style={styles.tall}><Ionicons name="close" /></Pressable>
            <LinearGradient colors={['#7C3AED', '#EC4899']} />
            <Text>Oops, something broke</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 24, fontWeight: '900', marginTop: 10, paddingHorizontal: 16 },
    small: { height: 30, borderRadius: 22, width: 44, padding: 2 },
    tall: { height: 48, borderRadius: 12, borderTopLeftRadius: 999 },
    card: { shadowRadius: 40, elevation: 12, borderRadius: 13 },
    quiet: { shadowRadius: 4, elevation: 2 },
    label: { textTransform: 'uppercase', letterSpacing: 1.5 },
});
Animated.loop(pulse).start();
const ease = Easing.bounce;

import 'react-native-gesture-handler';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { BarChart3, BookOpen, CookingPot, UserRound } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DishesScreen } from './src/screens/DishesScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { MacroDatabase, getLatestBodyRecord, getProfile, openMacroDb } from './src/db/database';
import { BodyRecord, Profile } from './src/types';
import { colors } from './src/theme';

type RootStackParamList = {
  Tabs: undefined;
  Stats: undefined;
};

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [db, setDb] = useState<MacroDatabase | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestBody, setLatestBody] = useState<BodyRecord | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(async () => {
    const database = db ?? (await openMacroDb());
    const [nextProfile, nextBody] = await Promise.all([getProfile(database), getLatestBodyRecord(database)]);
    setDb(database);
    setProfile(nextProfile);
    setLatestBody(nextBody);
  }, [db]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const onChanged = useCallback(() => setRefreshToken((value) => value + 1), []);

  if (!db || !profile || !latestBody) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.loadingText}>Opening local database</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs">
            {({ navigation }) => (
              <Tabs.Navigator
                screenOptions={{
                  headerShown: false,
                  tabBarActiveTintColor: colors.green,
                  tabBarInactiveTintColor: colors.muted,
                  tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.line,
                    height: 86,
                    paddingBottom: 24,
                    paddingTop: 8
                  },
                  tabBarLabelStyle: {
                    fontWeight: '800'
                  }
                }}
              >
                <Tabs.Screen
                  name="Nutrition"
                  options={{
                    tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />
                  }}
                >
                  {() => (
                    <NutritionScreen
                      db={db}
                      profile={profile}
                      latestBody={latestBody}
                      refreshToken={refreshToken}
                      onOpenStats={() => navigation.navigate('Stats')}
                      onChanged={onChanged}
                    />
                  )}
                </Tabs.Screen>
                <Tabs.Screen
                  name="Dishes"
                  options={{
                    tabBarIcon: ({ color }) => <CookingPot size={22} color={color} />
                  }}
                >
                  {() => <DishesScreen db={db} refreshToken={refreshToken} onChanged={onChanged} />}
                </Tabs.Screen>
                <Tabs.Screen
                  name="Profile"
                  options={{
                    tabBarIcon: ({ color }) => <UserRound size={22} color={color} />
                  }}
                >
                  {() => (
                    <ProfileScreen
                      db={db}
                      profile={profile}
                      latestBody={latestBody}
                      refreshToken={refreshToken}
                      onChanged={onChanged}
                    />
                  )}
                </Tabs.Screen>
              </Tabs.Navigator>
            )}
          </Stack.Screen>
          <Stack.Screen name="Stats">
            {() => <StatsScreen db={db} profile={profile} latestBody={latestBody} refreshToken={refreshToken} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.paper
  },
  loadingText: {
    color: colors.muted,
    fontWeight: '800'
  }
});

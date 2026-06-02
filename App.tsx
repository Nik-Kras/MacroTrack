import 'react-native-gesture-handler';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, CookingPot, UserRound } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DishesScreen } from './src/screens/DishesScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { MacroDatabase, getLatestBodyRecord, getProfile, openMacroDb } from './src/db/database';
import { createLogger, getLogSummary, serializeError } from './src/lib/logger';
import { BodyRecord, Profile } from './src/types';
import { colors } from './src/theme';

type NutritionStackParamList = {
  NutritionHome: undefined;
  Stats: undefined;
};

const Tabs = createBottomTabNavigator();
const NutritionStack = createNativeStackNavigator<NutritionStackParamList>();
const logger = createLogger('app');

export default function App() {
  const [db, setDb] = useState<MacroDatabase | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestBody, setLatestBody] = useState<BodyRecord | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [startupError, setStartupError] = useState<ReturnType<typeof serializeError> | null>(null);
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  const load = useCallback(async () => {
    const startedAt = Date.now();
    logger.info('startup load started', { has_database: Boolean(db), refresh_token: refreshToken });
    setStartupError(null);
    setLoadingTooLong(false);
    try {
      const database = db ?? (await openMacroDb());
      const [nextProfile, nextBody] = await Promise.all([getProfile(database), getLatestBodyRecord(database)]);
      logger.info('startup data loaded', {
        has_profile: Boolean(nextProfile),
        has_body_record: Boolean(nextBody),
        duration_ms: Date.now() - startedAt
      });
      if (!nextProfile) throw new Error('Profile row was not found after database startup.');
      if (!nextBody) throw new Error('Body record row was not found after database startup.');
      setDb(database);
      setProfile(nextProfile);
      setLatestBody(nextBody);
    } catch (error) {
      logger.error('startup load failed', error, { duration_ms: Date.now() - startedAt });
      setStartupError(serializeError(error));
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  useEffect(() => {
    if (db && profile && latestBody) return;
    const timeout = setTimeout(() => {
      logger.warn('startup loading exceeded expected duration', {
        has_database: Boolean(db),
        has_profile: Boolean(profile),
        has_body_record: Boolean(latestBody)
      });
      setLoadingTooLong(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [db, profile, latestBody, refreshToken]);

  const onChanged = useCallback(() => setRefreshToken((value) => value + 1), []);

  if (startupError) {
    return (
      <SafeAreaProvider>
        <ScrollView style={styles.errorScreen} contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorEyebrow}>Startup failed</Text>
          <Text style={styles.errorTitle}>MacroTrack could not open</Text>
          <Text style={styles.errorMessage}>{startupError.message}</Text>
          <View style={styles.logPanel}>
            <Text style={styles.logTitle}>Recent app logs</Text>
            <Text selectable style={styles.logText}>
              {getLogSummary(16) || 'No logs captured yet.'}
            </Text>
          </View>
          <Pressable style={styles.retryButton} onPress={() => setRefreshToken((value) => value + 1)}>
            <Text style={styles.retryText}>Retry startup</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaProvider>
    );
  }

  if (!db || !profile || !latestBody) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.loadingText}>Opening local database</Text>
          {loadingTooLong ? (
            <View style={styles.loadingLogPanel}>
              <Text style={styles.logTitle}>Still loading. Recent logs:</Text>
              <Text selectable style={styles.logText}>
                {getLogSummary(8) || 'No logs captured yet.'}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
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
              <NutritionStack.Navigator screenOptions={{ headerShown: false }}>
                <NutritionStack.Screen name="NutritionHome">
                  {({ navigation }) => (
                    <NutritionScreen
                      db={db}
                      profile={profile}
                      latestBody={latestBody}
                      refreshToken={refreshToken}
                      onOpenStats={() => navigation.navigate('Stats')}
                      onChanged={onChanged}
                    />
                  )}
                </NutritionStack.Screen>
                <NutritionStack.Screen name="Stats">
                  {() => <StatsScreen db={db} profile={profile} latestBody={latestBody} refreshToken={refreshToken} />}
                </NutritionStack.Screen>
              </NutritionStack.Navigator>
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
  },
  errorScreen: {
    flex: 1,
    backgroundColor: colors.paper
  },
  errorContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 14
  },
  errorEyebrow: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  errorTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900'
  },
  errorMessage: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700'
  },
  logPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 12,
    gap: 8
  },
  loadingLogPanel: {
    alignSelf: 'stretch',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 12,
    gap: 8
  },
  logTitle: {
    color: colors.ink,
    fontWeight: '900'
  },
  logText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.green
  },
  retryText: {
    color: colors.card,
    fontWeight: '900'
  }
});

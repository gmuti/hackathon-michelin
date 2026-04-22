import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import RestaurantLogo from '../../logo/restaurant.svg';
import HotelLogo from '../../logo/hotel.svg';
import CommunityLogo from '../../logo/communaute.svg';
import ProfileLogo from '../../logo/profil.svg';
import { Text } from 'react-native';

import { useAuth } from '../context/AuthContext';

import SwipeScreen from '../screens/swipe/SwipeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import JamScreen from '../screens/jam/JamScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

export type RootTabParamList = {
  Restaurants: { mode: 'restaurant' } | undefined;
  Hotels: { mode: 'hotel' } | undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, React.ComponentType<any>> = {
  Restaurants: RestaurantLogo,
  Hotels: HotelLogo,
  Community: CommunityLogo,
  Profile: ProfileLogo,
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#ba0b2f',
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#ba0b2f',
        tabBarInactiveTintColor: 'rgba(186,11,47,0.55)',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{route.name}</Text>
        ),
        tabBarIcon: () => {
          const Logo = TAB_ICONS[route.name];
          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Logo width={32} height={32} fill="#ba0b2f" />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Restaurants" component={SwipeScreen} initialParams={{ mode: 'restaurant' }} />
      <Tab.Screen name="Hotels" component={SwipeScreen} initialParams={{ mode: 'hotel' }} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#E8C547" size="large" />
      </View>
    );
  }

  // Nouvel utilisateur : pas encore configuré ses préférences
  const needsOnboarding = !!token && user?.cuisinePreferences?.length === 0;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!token ? (
          // ── Flux non authentifié ──────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : needsOnboarding ? (
          // ── Onboarding après inscription ──────────────────────
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // ── Application principale ────────────────────────────
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Jam" component={JamScreen} options={{ presentation: 'modal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

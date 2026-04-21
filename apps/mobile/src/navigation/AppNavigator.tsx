import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import SwipeScreen from '../screens/swipe/SwipeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import JamScreen from '../screens/jam/JamScreen';

export type RootTabParamList = {
  Restaurants: undefined;
  Hotels: undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<string, string> = {
  Restaurants: '🍽️',
  Hotels: '🏨',
  Community: '👥',
  Profile: '👤',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0D0D',
          borderTopColor: '#1C1C1C',
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#E8C547',
        tabBarInactiveTintColor: '#444',
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 10, fontWeight: '600' }}>{route.name}</Text>
        ),
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 22, opacity: color === '#E8C547' ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Jam" component={JamScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

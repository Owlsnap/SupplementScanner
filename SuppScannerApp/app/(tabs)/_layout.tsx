import { Tabs } from 'expo-router';
import React from 'react';
import { BottomNav } from '@/components/BottomNav';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#f5faf8' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="stack" options={{ title: 'Stack' }} />
      <Tabs.Screen name="saved-deep-dives" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

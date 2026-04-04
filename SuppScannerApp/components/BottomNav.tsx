import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabConfig = {
  route: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const TABS: TabConfig[] = [
  { route: 'index', label: 'Scan', icon: 'center-focus-strong' },
  { route: 'history', label: 'History', icon: 'history' },
  { route: 'search', label: 'Search', icon: 'search' },
  { route: 'rewards', label: 'Rewards', icon: 'military-tech' },
];

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.outerWrapper}>
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab, index) => {
        const isActive = state.index === index;
        const routeKey = state.routes[index]?.key;
        const routeName = state.routes[index]?.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: routeKey,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented) {
            navigation.navigate(routeName || tab.route);
          }
        };

        if (isActive && tab.route === 'index') {
          return (
            <TouchableOpacity key={tab.route} style={styles.tabItem} onPress={onPress} activeOpacity={0.8}>
              <View style={styles.activeIconContainer}>
                <MaterialIcons name={tab.icon} size={28} color="#ffffff" />
              </View>
              <Text style={[styles.tabLabel, styles.activeLabel]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.route} style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.iconContainer}>
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    backgroundColor: '#00685f',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#00685f',
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#00352e',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  activeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#00352e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
  },
  activeLabel: {
    color: '#ffffff',
  },
});

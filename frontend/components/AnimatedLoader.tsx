import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnimatedLoaderProps {
  message?: string;
  showLogo?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export default function AnimatedLoader({ 
  message = 'Loading...', 
  showLogo = true,
  size = 'fullscreen' 
}: AnimatedLoaderProps) {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in and scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Rotation animation for outer ring
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotate.start();

    // Glow animation
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    // Dots animation
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dotAnim1, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim1, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim2, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim3, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    animateDots();

    return () => {
      pulse.stop();
      rotate.stop();
      glow.stop();
    };
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const getContainerStyle = () => {
    switch (size) {
      case 'small':
        return styles.containerSmall;
      case 'medium':
        return styles.containerMedium;
      case 'large':
        return styles.containerLarge;
      default:
        return styles.containerFullscreen;
    }
  };

  const getLogoSize = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40 };
      case 'medium':
        return { width: 60, height: 60 };
      case 'large':
        return { width: 80, height: 80 };
      default:
        return { width: 120, height: 120 };
    }
  };

  const getRingSize = () => {
    switch (size) {
      case 'small':
        return 60;
      case 'medium':
        return 90;
      case 'large':
        return 120;
      default:
        return 180;
    }
  };

  const logoSize = getLogoSize();
  const ringSize = getRingSize();

  if (size === 'fullscreen') {
    return (
      <View style={[styles.container, getContainerStyle()]}>
        <LinearGradient
          colors={['#0A0A0A', '#111111', '#0A0A0A']}
          style={StyleSheet.absoluteFill}
        />
        
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Glow effect behind logo */}
          <Animated.View
            style={[
              styles.glowEffect,
              {
                width: ringSize * 1.5,
                height: ringSize * 1.5,
                opacity: glowOpacity,
              },
            ]}
          />

          {/* Rotating outer ring */}
          <Animated.View
            style={[
              styles.outerRing,
              {
                width: ringSize,
                height: ringSize,
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            <LinearGradient
              colors={['#00E55A', 'transparent', '#00E55A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.ringGradient, { borderRadius: ringSize / 2 }]}
            />
          </Animated.View>

          {/* Inner pulsing container with logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                width: ringSize - 20,
                height: ringSize - 20,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {showLogo && (
              <Image
                source={require('../assets/images/bynix-logo.png')}
                style={[styles.logo, logoSize]}
                resizeMode="contain"
              />
            )}
          </Animated.View>

          {/* Loading text */}
          <View style={styles.textContainer}>
            <Text style={styles.brandText}>BYNIX</Text>
            <View style={styles.loadingTextRow}>
              <Text style={styles.loadingText}>{message}</Text>
              <View style={styles.dotsContainer}>
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: dotAnim1,
                      transform: [{ scale: dotAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      })}],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: dotAnim2,
                      transform: [{ scale: dotAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      })}],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: dotAnim3,
                      transform: [{ scale: dotAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      })}],
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  transform: [{
                    translateX: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-200, 200],
                    }),
                  }],
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  // Compact loader for inline use
  return (
    <View style={[styles.container, getContainerStyle()]}>
      <Animated.View
        style={[
          styles.compactContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Rotating ring */}
        <Animated.View
          style={[
            styles.compactRing,
            {
              width: ringSize,
              height: ringSize,
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        >
          <View style={[styles.ringSegment, { borderRadius: ringSize / 2 }]} />
        </Animated.View>

        {/* Logo */}
        {showLogo && (
          <Animated.View
            style={[
              styles.compactLogoContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Image
              source={require('../assets/images/bynix-logo.png')}
              style={[styles.logo, logoSize]}
              resizeMode="contain"
            />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  containerFullscreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  containerSmall: {
    width: 80,
    height: 80,
  },
  containerMedium: {
    width: 120,
    height: 120,
  },
  containerLarge: {
    width: 160,
    height: 160,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#00E55A',
    shadowColor: '#00E55A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  outerRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGradient: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    borderTopColor: '#00E55A',
    borderRightColor: '#00E55A50',
    borderBottomColor: 'transparent',
    borderLeftColor: '#00E55A50',
  },
  compactRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringSegment: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#00E55A',
    borderRightColor: '#00E55A50',
  },
  logoContainer: {
    backgroundColor: '#111111',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  compactLogoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    tintColor: undefined,
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#00E55A',
    letterSpacing: 8,
    marginBottom: 10,
    textShadowColor: '#00E55A',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  loadingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
    letterSpacing: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E55A',
    marginHorizontal: 2,
  },
  progressContainer: {
    width: 200,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
    marginTop: 30,
    overflow: 'hidden',
  },
  progressBar: {
    width: 60,
    height: '100%',
    backgroundColor: '#00E55A',
    borderRadius: 1,
  },
});

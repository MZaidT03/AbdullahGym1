import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import colors from '../constants/colors';

export const QRCodeView = ({ size = 120 }) => {
  // Pattern matrix representing a clean stylized QR code
  const matrix = [
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
    [1,1,0,1,0,1,1,1,0,0,1,0,1,1,0,1,1],
    [0,1,1,0,1,0,0,1,1,1,0,1,0,0,1,0,0],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1,1,0,1,0,1,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,0,1,1,0,1,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,1,1],
  ];

  const cellSize = size / matrix.length;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {matrix.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <View
              key={colIndex}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell === 1 ? colors.textPrimary : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {},
});

export default QRCodeView;

'use client';

import React from 'react';
import { DetailCardProps } from './types';

export const DetailCard: React.FC<DetailCardProps> = ({
  title,
  value,
  subvalue,
  icon: Icon,
  color,
  onClick,
  isActive,
}) => (
  <div
    onClick={onClick}
    className={`glass-panel p-6 rounded-2xl border-l-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} ${isActive ? 'ring-2 ring-white/20 bg-white/5' : ''}`}
    style={{ borderLeftColor: color }}
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg bg-white/5 text-white`}>
        <Icon size={20} color={color} />
      </div>
    </div>
    <p className="text-xs text-gray-500">{subvalue}</p>
  </div>
);

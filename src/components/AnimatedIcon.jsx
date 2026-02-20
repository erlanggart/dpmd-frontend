// src/components/AnimatedIcon.jsx
import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Landmark,
  ArrowLeft,
  FileText,
  Wallet,
  BadgeDollarSign,
  Coins,
  HandCoins,
  PiggyBank,
  BarChart3,
  Calendar,
  Mail,
  User,
} from 'lucide-react';
import './AnimatedIcon.css';

const ICON_MAP = {
  dashboard: LayoutDashboard,
  users: Users,
  briefcase: Briefcase,
  dollar: HandCoins,
  trending: TrendingUp,
  landmark: Landmark,
  back: ArrowLeft,
  file: FileText,
  wallet: Wallet,
  badge_dollar: BadgeDollarSign,
  coins: Coins,
  piggy: PiggyBank,
  chart: BarChart3,
  calendar: Calendar,
  mail: Mail,
  user: User,
};

const AnimatedIcon = ({ type, isActive, isHovered, className = 'w-5 h-5' }) => {
  const Icon = ICON_MAP[type] || LayoutDashboard;

  const stateClass = isActive
    ? 'animated-icon--active'
    : isHovered
      ? 'animated-icon--hovered'
      : '';

  return (
    <div className={`animated-icon ${stateClass}`}>
      <Icon className={className} strokeWidth={isActive ? 2.4 : 2} />
    </div>
  );
};

export default AnimatedIcon;

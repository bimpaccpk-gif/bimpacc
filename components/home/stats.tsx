"use client";

import { Users, BookOpen, TrendingUp, Star, Award, Code, Clock } from "lucide-react";

interface Stat {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

const stats: Stat[] = [];

export function Stats() {
  return (
    <section className="relative overflow-hidden border-y bg-muted/30 py-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dots-pattern opacity-30" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`scroll-animate visible animate-fadeInUp stagger-${index + 1}`}
              style={{ opacity: 1 }}
            >
              <div className="group flex flex-col items-center text-center">
                {/* Icon */}
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="h-8 w-8" />
                </div>
                
                {/* Value */}
                <div className="mb-1 text-4xl font-bold text-foreground">
                  {stat.value}
                </div>
                
                {/* Label */}
                <div className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </div>
                
                {/* Trend (if available) */}
                {stat.trend && (
                  <div className="mt-2 text-xs text-primary">
                    {stat.trend}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

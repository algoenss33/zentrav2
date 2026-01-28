"use client"

interface MiningStatsProps {
  miningSpeed: number
  monthlyEarnings: number
  annualEarnings: number
  apyRate: number
}

export default function MiningStats({ miningSpeed, monthlyEarnings, annualEarnings, apyRate }: MiningStatsProps) {
  const dailyEarnings = miningSpeed

  const stats = [
    {
      label: "Mining Speed",
      value: Math.floor(dailyEarnings).toLocaleString(),
      unit: "GOLD/day",
    },
    {
      label: "Daily Earnings",
      value: Math.floor(dailyEarnings).toLocaleString(),
      unit: "GOLD",
    },
    {
      label: "Monthly",
      value: Math.floor(monthlyEarnings).toLocaleString(),
      unit: "GOLD",
    },
    {
      label: "Annual",
      value: Math.floor(annualEarnings).toLocaleString(),
      unit: "GOLD",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative rounded-xl p-3 overflow-hidden transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)",
            border: "2px solid rgba(251, 191, 36, 0.4)",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(251, 191, 36, 0.2), 0 0 20px rgba(251, 191, 36, 0.1)"
          }}
        >
          {/* Mining Pattern Background */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px),
                repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234, 88, 12, 0.1) 8px, rgba(234, 88, 12, 0.1) 16px)
              `,
              backgroundSize: "32px 32px"
            }}
          />
          
          {/* Glowing Corner Effects */}
          <div 
            className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          <div 
            className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          
          <div className="relative z-10">
            {/* Label */}
            <div className="text-[10px] text-yellow-300/80 mb-1 uppercase tracking-wide font-semibold">
              {stat.label}
            </div>
            
            {/* Value */}
            <div 
              className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300"
              style={{
                textShadow: "0 0 15px rgba(251, 191, 36, 0.5)"
              }}
            >
              {stat.value}
            </div>
            
            {/* Unit */}
            <div className="text-[9px] text-yellow-200/60 mt-0.5">
              {stat.unit}
            </div>
            
            {/* Bottom Accent Line */}
            <div className="mt-2 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

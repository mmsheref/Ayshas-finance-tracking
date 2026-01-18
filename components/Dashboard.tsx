
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExpenseProfitChart from './ExpenseProfitChart';
import { useAppContext } from '../context/AppContext';
import { calculateTotalExpenses, getTodayDateString, subtractDays, formatIndianNumberCompact } from '../utils/record-utils';
import { SparklesIcon, ClockIcon, FireIcon, ListIcon, ChevronRightIcon } from './Icons';
import GasManager from './GasManager';

type ChartFilter = 'WEEK' | 'MONTH' | 'YEAR';

const FilterPill: React.FC<{ label: string, value: ChartFilter, active: boolean, onClick: (val: ChartFilter) => void }> = ({ label, value, active, onClick }) => (
    <button 
      onClick={() => onClick(value)}
      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${active ? 'bg-surface-on dark:bg-surface-on-dark text-surface dark:text-surface-dark shadow-sm' : 'bg-transparent text-surface-on-variant dark:text-surface-on-variant-dark border border-surface-outline/20 dark:border-surface-outline-dark/20'}`}
    >
        {label}
    </button>
);

// Minimal Gas Card for Dashboard Grid
const GasTrackerCard: React.FC = () => {
    const { gasState } = useAppContext();
    const [isManagerOpen, setManagerOpen] = useState(false);
    const { currentStock, emptyCylinders } = gasState;

    return (
        <>
            <div 
                className="bg-surface-container-high dark:bg-surface-dark-container-high p-4 rounded-[24px] active:scale-[0.98] transition-transform cursor-pointer h-full flex flex-col justify-between relative overflow-hidden"
                onClick={() => setManagerOpen(true)}
            >
                <div className="absolute -right-4 -top-4 opacity-[0.05] text-surface-on dark:text-surface-on-dark rotate-12 pointer-events-none">
                    <FireIcon className="w-24 h-24" />
                </div>
                
                <div className="flex items-center gap-2 text-tertiary dark:text-tertiary-dark mb-2">
                    <FireIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Gas Stock</span>
                </div>
                
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-surface-on dark:text-surface-on-dark">{currentStock}</span>
                        <span className="text-xs font-medium text-surface-on-variant dark:text-surface-on-variant-dark">Full</span>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-surface-on-variant dark:text-surface-on-variant-dark">
                        <span className="font-bold">{emptyCylinders}</span>&nbsp;Empty Shells
                    </div>
                </div>
            </div>
            {isManagerOpen && <GasManager onClose={() => setManagerOpen(false)} />}
        </>
    );
};

const Dashboard: React.FC = () => {
  const { sortedRecords: records, allSortedRecords, trackedItems } = useAppContext();
  const navigate = useNavigate();
  const [chartFilter, setChartFilter] = useState<ChartFilter>('WEEK');

  // 1. Get Dates
  const todayStr = getTodayDateString();

  // 2. Prepare Pulse Data
  const pulseStats = useMemo(() => {
    const displayRecord = records.find(r => r.date < todayStr);
    if (!displayRecord) return null;

    const expenses = calculateTotalExpenses(displayRecord);
    const isYesterday = displayRecord.date === subtractDays(todayStr, 1);

    let label = '';
    if (isYesterday) label = 'Yesterday';
    else label = new Date(displayRecord.date).toLocaleDateString('en-GB', { weekday: 'long' });

    const profit = displayRecord.totalSales - expenses;
    
    return {
        label,
        dateDisplay: new Date(displayRecord.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        sales: displayRecord.totalSales,
        expenses,
        profit,
        recordId: displayRecord.id,
        isClosed: displayRecord.isClosed
    };
  }, [records, todayStr]);

  // 3. Prepare Chart Data
  const chartData = useMemo(() => {
    let data = [];
    if (chartFilter === 'WEEK') data = allSortedRecords.slice(0, 7);
    else if (chartFilter === 'MONTH') data = allSortedRecords.slice(0, 30);
    else data = allSortedRecords.slice(0, 90);

    return data.reverse().map(r => ({
        date: r.date,
        sales: r.totalSales,
        expenses: calculateTotalExpenses(r),
        profit: r.totalSales - calculateTotalExpenses(r)
    }));
  }, [allSortedRecords, chartFilter]);

  // 4. Inventory Watch Data
  const inventoryAlerts = useMemo(() => {
      if (trackedItems.length === 0) return [];
      const alerts: { name: string, daysAgo: number }[] = [];
      const today = new Date(todayStr);

      trackedItems.forEach(itemName => {
          const lastRecord = allSortedRecords.find(r => 
              r.expenses.some(cat => cat.items.some(i => i.name === itemName && i.amount > 0))
          );
          if (lastRecord) {
              const lastDate = new Date(lastRecord.date);
              const diffTime = Math.abs(today.getTime() - lastDate.getTime());
              alerts.push({ name: itemName, daysAgo: Math.ceil(diffTime / (1000 * 60 * 60 * 24)) });
          } else {
               alerts.push({ name: itemName, daysAgo: -1 });
          }
      });
      return alerts.sort((a, b) => b.daysAgo - a.daysAgo);
  }, [allSortedRecords, trackedItems, todayStr]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-end px-1">
        <div>
          <p className="text-sm font-medium text-surface-on-variant dark:text-surface-on-variant-dark opacity-80">Overview</p>
          <h1 className="text-3xl font-normal text-surface-on dark:text-surface-on-dark tracking-tight">Dashboard</h1>
        </div>
        <button 
            onClick={() => navigate('/records')}
            className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-surface-dark-container-high flex items-center justify-center text-surface-on dark:text-surface-on-dark active:scale-95 transition-transform"
        >
            <ListIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Pulse Card */}
      <div 
        onClick={() => pulseStats && navigate(`/records/${pulseStats.recordId}`)}
        className={`relative overflow-hidden rounded-[32px] p-6 shadow-sm active:scale-[0.98] transition-transform cursor-pointer ${
            !pulseStats 
            ? 'bg-surface-container dark:bg-surface-dark-container' 
            : pulseStats.profit >= 0 
                ? 'bg-gradient-to-br from-primary-container to-surface-container dark:from-primary-container-dark dark:to-surface-dark-container' 
                : 'bg-gradient-to-br from-error-container to-surface-container dark:from-error-container-dark dark:to-surface-dark-container'
        }`}
      >
        {pulseStats ? (
            <>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-60 text-surface-on dark:text-surface-on-dark">
                                {pulseStats.label}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface/30 backdrop-blur-md text-surface-on dark:text-surface-on-dark">
                                {pulseStats.dateDisplay}
                            </span>
                        </div>
                        {pulseStats.isClosed ? (
                            <span className="text-2xl font-bold opacity-80">Shop Closed</span>
                        ) : (
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold tracking-tight text-surface-on dark:text-surface-on-dark">
                                    {pulseStats.profit >= 0 ? '+' : '-'}₹{formatIndianNumberCompact(Math.abs(pulseStats.profit))}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="p-3 bg-surface/20 rounded-full backdrop-blur-sm">
                        <SparklesIcon className="w-6 h-6 text-surface-on dark:text-surface-on-dark" />
                    </div>
                </div>

                {!pulseStats.isClosed && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-on/5 dark:border-surface-on-dark/5">
                        <div>
                            <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">Sales</p>
                            <p className="text-lg font-bold">₹{formatIndianNumberCompact(pulseStats.sales)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">Expenses</p>
                            <p className="text-lg font-bold">₹{formatIndianNumberCompact(pulseStats.expenses)}</p>
                        </div>
                    </div>
                )}
            </>
        ) : (
            <div className="py-8 text-center opacity-60">
                <p>No past records found.</p>
                <p className="text-xs mt-1">Add a record to see stats here.</p>
            </div>
        )}
      </div>

      {/* Resources Grid (Gas & Inventory) */}
      <div className="grid grid-cols-2 gap-3 h-40">
        <GasTrackerCard />
        
        {/* Inventory Watch Card */}
        <div 
            className="bg-secondary-container/30 dark:bg-secondary-container-dark/30 border border-secondary-container dark:border-secondary-container-dark p-4 rounded-[24px] active:scale-[0.98] transition-transform cursor-pointer h-full flex flex-col"
            onClick={() => navigate('/settings')} 
        >
            <div className="flex items-center gap-2 text-secondary dark:text-secondary-dark mb-3">
                <ClockIcon className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Watchlist</h3>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {inventoryAlerts.length > 0 ? (
                    inventoryAlerts.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-surface-on dark:text-surface-on-dark truncate mr-2 text-xs font-medium">{item.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.daysAgo > 7 || item.daysAgo === -1
                                ? 'bg-error/20 text-error dark:text-error-light' 
                                : 'bg-surface/50 text-surface-on-variant dark:text-surface-on-variant-dark'
                            }`}>
                                {item.daysAgo === -1 ? 'New' : `${item.daysAgo}d`}
                            </span>
                        </div>
                    ))
                ) : (
                     <div className="h-full flex items-center justify-center text-[10px] text-surface-on-variant/60 dark:text-surface-on-variant-dark/60 text-center">
                         Tap to add items
                     </div>
                )}
            </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-surface-container-low dark:bg-surface-dark-container-low rounded-[32px] p-5 border border-surface-outline/5 dark:border-surface-outline-dark/5">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-bold text-surface-on dark:text-surface-on-dark">Profit Flow</h3>
                <p className="text-xs text-surface-on-variant dark:text-surface-on-variant-dark">Net income over time</p>
            </div>
            <div className="flex bg-surface-container-high dark:bg-surface-dark-container-high rounded-full p-1">
                <FilterPill label="7D" value="WEEK" active={chartFilter === 'WEEK'} onClick={setChartFilter} />
                <FilterPill label="30D" value="MONTH" active={chartFilter === 'MONTH'} onClick={setChartFilter} />
            </div>
        </div>
        <ExpenseProfitChart data={chartData} />
      </div>
    </div>
  );
};

export default Dashboard;

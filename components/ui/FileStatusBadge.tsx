"use client";

import { Loader2, CheckCircle2, AlertCircle, Clock, Eye } from "lucide-react";
import type { FileStatus } from "@/lib/types";

interface FileStatusBadgeProps {
  status: FileStatus;
  progress?: number;
  estimatedTime?: string;
  error?: string;
  className?: string;
}

export default function FileStatusBadge({
  status,
  progress,
  estimatedTime,
  error,
  className = "",
}: FileStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "uploading":
        return {
          icon: <Loader2 size={12} className="animate-spin" />,
          text: "Uploading",
          bgColor: "bg-blue-950/20 dark:bg-blue-950/30",
          borderColor: "border-blue-900/50 dark:border-blue-700/50",
          textColor: "text-blue-600 dark:text-blue-400",
          progressColor: "bg-blue-500",
          showProgress: true,
          isIndeterminate: true,
        };
      case "pending-confirmation":
        return {
          icon: <Clock size={12} />,
          text: "Confirming",
          bgColor: "bg-yellow-950/20 dark:bg-yellow-950/30",
          borderColor: "border-yellow-900/50 dark:border-yellow-700/50",
          textColor: "text-yellow-600 dark:text-yellow-400",
          progressColor: "bg-yellow-500",
          showProgress: true,
          isIndeterminate: true,
        };
      case "confirmed":
        return {
          icon: <CheckCircle2 size={12} />,
          text: "Confirmed",
          bgColor: "bg-green-950/20 dark:bg-green-950/30",
          borderColor: "border-green-900/50 dark:border-green-700/50",
          textColor: "text-green-600 dark:text-green-400",
          progressColor: "bg-green-500",
          showProgress: false,
          isIndeterminate: false,
        };
      case "failed":
        return {
          icon: <AlertCircle size={12} />,
          text: "Failed",
          bgColor: "bg-red-950/20 dark:bg-red-950/30",
          borderColor: "border-red-900/50 dark:border-red-700/50",
          textColor: "text-red-600 dark:text-red-400",
          progressColor: "bg-red-500",
          showProgress: false,
          isIndeterminate: false,
        };
      case "syncing":
        return {
          icon: <Loader2 size={12} className="animate-spin" />,
          text: "Syncing",
          bgColor: "bg-purple-950/20 dark:bg-purple-950/30",
          borderColor: "border-purple-900/50 dark:border-purple-700/50",
          textColor: "text-purple-600 dark:text-purple-400",
          progressColor: "bg-purple-500",
          showProgress: false,
          isIndeterminate: false,
        };
      case "queued":
        return {
          icon: <Clock size={12} />,
          text: "Queue",
          bgColor: "bg-zinc-100 dark:bg-zinc-800/30",
          borderColor: "border-orange-900/50 dark:border-orange-700/50",
          textColor: "text-orange-600 dark:text-orange-400",
          progressColor: "bg-orange-500",
          showProgress: false,
          isIndeterminate: false,
        };
      case "deleted":
        return {
          icon: <Eye size={12} />,
          text: "In Hidden Files",
          bgColor: "bg-red-950/20 dark:bg-red-950/30",
          borderColor: "border-red-900/50 dark:border-red-700/50",
          textColor: "text-red-500",
          progressColor: "bg-red-500",
          showProgress: false,
          isIndeterminate: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config || status === "idle") {
    return null;
  }

  const tooltipContent = error
    ? error
    : estimatedTime
      ? `Estimated time: ${estimatedTime}`
      : status === "pending-confirmation"
        ? "Waiting for blockchain confirmation"
        : "";

  const displayProgress = progress !== undefined ? progress : 0;

  return (
    <>
      <style jsx global>{`
        @keyframes progress-indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        .animate-progress-loop {
          animation: progress-indeterminate 1.5s infinite linear;
        }
      `}</style>

      <div
        className={`relative inline-flex items-center gap-1.5 px-2 py-1 rounded border ${config.bgColor} ${config.borderColor} ${className}`}
        title={tooltipContent}
      >
        <span className={config.textColor}>{config.icon}</span>
        <span className={`text-[10px] font-semibold ${config.textColor}`}>
          {config.text}
        </span>

        {config.showProgress && !config.isIndeterminate && (
          <span className={`text-[10px] ${config.textColor}`}>
            {Math.round(displayProgress)}%
          </span>
        )}

        {config.showProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-b overflow-hidden">
            {config.isIndeterminate ? (
              <div
                className={`h-full w-1/3 ${config.progressColor} animate-progress-loop`}
              />
            ) : (
              <div
                className={`h-full ${config.progressColor} transition-all duration-300 ease-out`}
                style={{ width: `${displayProgress}%` }}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

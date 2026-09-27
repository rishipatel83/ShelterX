"""ShelterX - Habitat Thermal Analysis & Visualization
Renders conduction breakdown (pie chart) and 24-hour diurnal temperature
variation plots for rapid assessment of extreme-climate military/disaster shelters.

Usage:
    python charts.py [input_payload.json] [output_directory]
"""

import argparse
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless server rendering
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker


# Modern Aerospace / Defense Engineering Color Palette
PALETTE = {
    "wall": "#2563EB",         # Vibrant Cobalt Blue
    "roof": "#F59E0B",         # Sunset Amber
    "ambient": "#E11D48",      # Signal Crimson/Rose
    "target": "#059669",       # Military/Bio Green
    "comfort_band": "#D1FAE5", # Soft Emerald Tint
    "heating": "#F59E0B",      # Warm Amber Gold
    "cooling": "#0EA5E9",      # Crisp Sky Blue
    "text": "#0F172A",         # Deep Slate 900
    "subtext": "#64748B",      # Slate 500
    "grid": "#E2E8F0",         # Slate 200
    "night_bg": "#F8FAFC",     # Light Cool Slate
}


def apply_report_style():
    """Sets a clean, publication-ready style without clutter."""
    plt.rcParams.update({
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "axes.edgecolor": "#CBD5E1",
        "axes.linewidth": 1.0,
        "axes.labelcolor": PALETTE["text"],
        "text.color": PALETTE["text"],
        "xtick.color": PALETTE["subtext"],
        "ytick.color": PALETTE["subtext"],
        "font.size": 10,
        "font.family": "DejaVu Sans",
        "axes.grid": True,
        "grid.color": PALETTE["grid"],
        "grid.linestyle": ":",
        "grid.linewidth": 0.8,
        "axes.spines.top": False,
        "axes.spines.right": False,
    })


def get_sample_data():
    """Generates a realistic test dataset for high-altitude cold climate (Ladakh outpost)."""
    length, width, height = 5.0, 4.0, 2.8
    target_temp = 20.0
    outside_temp = -25.0
    wall_thick_m = 0.150
    roof_thick_m = 0.130
    k_insulation = 0.028

    wall_area = 2 * (length * height + width * height)
    roof_area = length * width
    delta_t = target_temp - outside_temp

    wall_watts = (k_insulation / wall_thick_m) * wall_area * delta_t
    roof_watts = (k_insulation / roof_thick_m) * roof_area * delta_t

    # 24-hour diurnal temperature cycle
    hourly_outside = [
        ("00:00", -26.0),
        ("04:00", -29.5),
        ("08:00", -20.0),
        ("12:00", -12.0),
        ("16:00", -15.5),
        ("20:00", -22.0),
    ]

    hourly = []
    for time_str, amb in hourly_outside:
        dt = target_temp - amb
        w_w = (k_insulation / wall_thick_m) * wall_area * dt
        r_w = (k_insulation / roof_thick_m) * roof_area * dt
        load = w_w + r_w
        hourly.append({
            "time": time_str,
            "outsideTempC": amb,
            "heatingLoadW": max(load, 0.0),
            "coolingLoadW": max(-load, 0.0),
        })

    return {
        "location": "Ladakh Forward Outpost (3,500m)",
        "materialName": "PUF Composite (k = 0.028 W/m·K)",
        "targetTempC": target_temp,
        "current": {
            "wallConductionW": wall_watts,
            "roofConductionW": roof_watts,
            "totalConductionW": wall_watts + roof_watts,
            "deltaTC": delta_t,
        },
        "hourly": hourly,
    }


def render_heat_loss_pie(payload, output_path):
    """Draws a premium donut chart showing wall vs roof heat transfer share."""
    apply_report_style()

    current = payload.get("current", {})
    wall_w = abs(current.get("wallConductionW", 0))
    roof_w = abs(current.get("roofConductionW", 0))
    total_w = wall_w + roof_w
    if total_w <= 0:
        total_w = 1.0

    is_heating = current.get("totalConductionW", 0) >= 0
    mode_text = "HEAT LOSS TO OUTSIDE" if is_heating else "HEAT GAIN FROM AMBIENT"
    indicator = "▼" if is_heating else "▲"
    indicator_color = "#E11D48" if is_heating else "#059669"

    fig, ax = plt.subplots(figsize=(7.2, 6.6), dpi=200)

    slices = [wall_w, roof_w]
    colors = [PALETTE["wall"], PALETTE["roof"]]

    pie_result = ax.pie(
        slices,
        colors=colors,
        startangle=105,
        counterclock=False,
        autopct="%1.1f%%",
        pctdistance=0.76,
        textprops={"fontsize": 12, "weight": "bold", "color": "white"},
        wedgeprops={"width": 0.38, "edgecolor": "white", "linewidth": 3.0, "antialiased": True},
    )
    wedges = pie_result[0]

    # Center metrics badge
    ax.text(0, 0.12, f"{indicator} {total_w:,.0f} W", ha="center", va="center",
            fontsize=22, weight="bold", color=PALETTE["text"])
    ax.text(0, -0.04, mode_text, ha="center", va="center",
            fontsize=9.5, weight="bold", color=indicator_color)
    ax.text(0, -0.16, "Thermal Conduction Rate", ha="center", va="center",
            fontsize=8.5, color=PALETTE["subtext"])

    # Bottom legend with detailed metrics
    wall_pct = (wall_w / total_w) * 100
    roof_pct = (roof_w / total_w) * 100
    labels = [
        f"Walls: {wall_w:,.0f} W ({wall_pct:.1f}%)",
        f"Roof:  {roof_w:,.0f} W ({roof_pct:.1f}%)",
    ]
    legend = ax.legend(
        wedges,
        labels,
        loc="lower center",
        bbox_to_anchor=(0.5, -0.09),
        ncol=2,
        frameon=True,
        facecolor="#F8FAFC",
        edgecolor="#E2E8F0",
        fontsize=10.5,
        handlelength=1.2,
        borderpad=0.6,
    )
    legend.get_frame().set_boxstyle("round,pad=0.5,rounding_size=0.4")

    # Clean headers
    loc = payload.get("location", "Habitat Model")
    mat = payload.get("materialName", "")
    dt_val = current.get("deltaTC", 0)

    fig.suptitle(f"Heat Transfer Conduction Profile — {loc}",
                 fontsize=14, weight="bold", y=0.98, color=PALETTE["text"])
    
    sub = f"ΔT Equilibrium: {dt_val:.1f}°C"
    if mat:
        sub += f"  •  Insulation: {mat}"
    fig.text(0.5, 0.93, sub, ha="center", fontsize=9.5, color=PALETTE["subtext"])

    ax.axis("equal")
    fig.tight_layout(rect=(0, 0.02, 1, 0.92))
    fig.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def render_diurnal_profile(payload, output_path):
    """Draws diurnal ambient temperature variations alongside required conduction load."""
    apply_report_style()

    hourly = payload.get("hourly", [])
    if not hourly:
        raise ValueError("Hourly temperature profile data is missing from payload.")

    times = [h.get("time", f"{i:02d}:00") for i, h in enumerate(hourly)]
    ambient_temps = [float(h.get("outsideTempC", 0)) for h in hourly]
    heating_loads = [float(h.get("heatingLoadW", 0)) for h in hourly]
    cooling_loads = [float(h.get("coolingLoadW", 0)) for h in hourly]
    target_temp = payload.get("targetTempC")

    fig, ax1 = plt.subplots(figsize=(9.6, 5.4), dpi=200)
    x_indices = list(range(len(times)))

    # Secondary y-axis for thermal load bars
    ax2 = ax1.twinx()
    ax1.set_zorder(ax2.get_zorder() + 1)
    ax1.patch.set_visible(False)

    # Shaded night background periods (first 2 and last points typically night)
    if len(x_indices) >= 4:
        ax1.axvspan(-0.5, 1.5, color=PALETTE["night_bg"], alpha=0.9, zorder=0)
        ax1.axvspan(len(x_indices) - 1.5, len(x_indices) - 0.5, color=PALETTE["night_bg"], alpha=0.9, zorder=0)

    # Secondary axis: thermal load bars
    bar_width = 0.42
    if any(hl > 0 for hl in heating_loads):
        ax2.bar(x_indices, heating_loads, width=bar_width, color=PALETTE["heating"],
                alpha=0.32, label="Heating Load Required (W)", edgecolor=PALETTE["heating"], linewidth=0.8)
    if any(cl > 0 for cl in cooling_loads):
        ax2.bar(x_indices, cooling_loads, width=bar_width, color=PALETTE["cooling"],
                alpha=0.32, label="Cooling Load Required (W)", edgecolor=PALETTE["cooling"], linewidth=0.8)

    ax2.set_ylabel("Required Conduction Power (Watts)", fontsize=10, weight="bold", color=PALETTE["subtext"])
    ax2.tick_params(axis="y", labelcolor=PALETTE["subtext"])
    ax2.grid(False)

    # Target comfort temperature line & band
    if target_temp is not None:
        ax1.axhspan(target_temp - 1.5, target_temp + 1.5, color=PALETTE["comfort_band"],
                    alpha=0.45, label="Comfort Envelope (±1.5°C)", zorder=1)
        ax1.axhline(target_temp, color=PALETTE["target"], linestyle="--",
                    linewidth=2.0, label=f"Inside Target ({target_temp:.1f}°C)", zorder=2)

    # Primary temperature line with gradient-style underlay
    ax1.plot(x_indices, ambient_temps, marker="o", markersize=7, linewidth=2.6,
             color=PALETTE["ambient"], markerfacecolor=PALETTE["ambient"],
             markeredgecolor="white", markeredgewidth=2.0,
             label="Ambient Outdoor Temp (°C)", zorder=3)

    # Data value labels on points
    for x_pos, temp in zip(x_indices, ambient_temps):
        ax1.annotate(f"{temp:.1f}°", (x_pos, temp), textcoords="offset points",
                     xytext=(0, 10), ha="center", fontsize=9,
                     weight="bold", color=PALETTE["ambient"],
                     bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.8))

    ax1.set_xticks(x_indices)
    ax1.set_xticklabels(times, fontsize=10, weight="bold")
    ax1.set_xlabel("Diurnal Time (24-Hour Timeline)", fontsize=10.5, weight="bold")
    ax1.set_ylabel("Temperature (°C)", fontsize=10.5, weight="bold")
    ax1.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))

    # Axis limits with clean headroom
    all_temps = ambient_temps + ([target_temp] if target_temp is not None else [])
    temp_min, temp_max = min(all_temps), max(all_temps)
    margin = max((temp_max - temp_min) * 0.25, 5.0)
    ax1.set_ylim(temp_min - margin * 0.35, temp_max + margin)

    # Combined polished legend at bottom
    handles1, labels1 = ax1.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    legend = ax1.legend(
        handles1 + handles2,
        labels1 + labels2,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.16),
        ncol=4,
        frameon=True,
        facecolor="#F8FAFC",
        edgecolor="#E2E8F0",
        fontsize=9.5,
    )
    legend.get_frame().set_boxstyle("round,pad=0.4,rounding_size=0.4")

    loc = payload.get("location", "Habitat Model")
    ax1.set_title(f"24-Hour Diurnal Temperature Variation — {loc}",
                  fontsize=13.5, weight="bold", pad=14, color=PALETTE["text"])

    fig.tight_layout()
    fig.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description="Generate ShelterX thermal charts.")
    parser.add_argument("input_file", nargs="?", help="JSON input file path")
    parser.add_argument("output_dir", nargs="?", help="Directory to save generated charts")
    args = parser.parse_args()

    if args.input_file and args.output_dir:
        input_path = Path(args.input_file)
        output_dir = Path(args.output_dir)
        with open(input_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = get_sample_data()
        output_dir = Path(__file__).resolve().parent / "output"

    output_dir.mkdir(parents=True, exist_ok=True)
    pie_chart_path = output_dir / "heat_transfer_pie_chart.png"
    temp_graph_path = output_dir / "temperature_variation_graph.png"

    render_heat_loss_pie(payload, pie_chart_path)
    render_diurnal_profile(payload, temp_graph_path)

    # Print output contract for backend process
    print(json.dumps({
        "success": True,
        "pieChartPath": str(pie_chart_path.resolve()),
        "temperatureGraphPath": str(temp_graph_path.resolve()),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        sys.stderr.write(f"Thermal chart generation error: {err}\n")
        print(json.dumps({"success": False, "error": str(err)}))
        sys.exit(1)

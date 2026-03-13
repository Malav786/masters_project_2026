# Masters Project

Long-term Masters project setup using Python, uv, and Antigravity.

## Stack
- Python
- uv
- Google Antigravity

## Main folders
- `data/`
- `notebooks/`
- `src/`
- `results/`
- `tests/`


# Masters Project

Self-Supervised Geometric Learning and Interactive Discovery of Structural Motifs in Agarose Polymer Stacking.

This repository contains the full pipeline for processing agarose polymer stacking configurations, organizing structural datasets, and preparing data for machine learning analysis.

---

# Tech Stack

- Python
- uv (Python package management)
- Google Antigravity (development environment)

---

# Dataset Pipeline

The project begins by organizing and validating structural data generated from DFT calculations.

## Step 1 — Dataset Inventory

Scan all CIF files and extract structural configuration metadata.

Output file: outputs/dataset_inventory.csv

This file maps **polymer stacking configurations → CIF structures**.

---

## Step 2 — Dataset Master

Merge structural configurations with DFT energy values.

Output file:


outputs/dataset_master.csv

This dataset is used as the **primary reference for machine learning tasks**.

---

# Running the Dataset Builder

If you want to run this script, install the required dependencies using **uv**.

```bash
pip install uv
uv venv
.venv\Scripts\activate (Windows) 
source .venv/bin/activate (Linux/Mac)
uv pip install pandas numpy tqdm ase
uv run python src/scripts/pys/01_build_dataset_inventory.py
```

 - Author - Malav Champaneria /
 - Masters Project - 2026
# Clustering Logic for Order Batching

Orders are clustered by proximity using either the Haversine formula (distance between lat/lon points) or K-Means clustering. Each batch is limited to 25kg or 30 orders. Clustering optimizes delivery routes and reduces total distance traveled.

- **Haversine:** Calculates great-circle distance between two points on the Earth.
- **K-Means:** Groups orders into clusters based on location proximity.

Batches are generated to minimize travel distance and balance load. 
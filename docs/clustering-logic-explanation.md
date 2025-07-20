# Clustering Logic in SiloDispatch

## Purpose
The clustering logic is designed to group delivery orders into optimal batches based on their geographic proximity and business constraints (max 30 orders or 25kg per batch). This minimizes total travel distance, balances driver workload, and improves operational efficiency.

---

## Step-by-Step Process

1. **Order Collection**
   - Fetch all orders from the database with status `PENDING`.

2. **Geocoding**
   - For each unique pincode in the orders, use the OpenCage API to convert the pincode into latitude and longitude coordinates.
   - Cache geocoding results to minimize API calls and speed up processing.

3. **Attach Coordinates**
   - Each order is mapped to its geocoded coordinates.

4. **Estimate Number of Clusters (k)**
   - Calculate the number of clusters needed:  
     $k = \lceil \frac{\text{number of orders}}{30} \rceil$
   - This ensures no batch exceeds 30 orders.

5. **K-Means Clustering**
   - Use the K-Means algorithm to group orders into `k` clusters based on their coordinates.
   - Each cluster represents a group of geographically close orders.

6. **Constraint Splitting**
   - For each cluster, check if the total number of orders or total weight exceeds the business constraints (30 orders or 25kg).
   - If a cluster exceeds constraints, split it into smaller batches that comply.

7. **Batch Creation**
   - For each valid batch:
     - Create a new Batch document in the database.
     - Assign the grouped orders to the batch.
     - Calculate and store the total weight.
     - Update the status of included orders to `ASSIGNED`.

8. **Driver Assignment (Post-Clustering)**
   - Supervisors can assign drivers to batches.
   - Each batch can be tracked independently.

---

## Technical Details

- **Geocoding:**  
  Uses OpenCage API for real-world coordinates.  
  Caching is implemented to avoid redundant API calls.

- **K-Means Algorithm:**  
  Orders are represented as points in latitude/longitude space.  
  Centroids are initialized, and orders are assigned to the nearest centroid.  
  Centroids are updated iteratively until convergence or a max number of iterations is reached.

- **Constraints:**  
  Max 30 orders per batch.  
  Max 25kg per batch.  
  Clusters are split as needed to enforce these constraints.

- **Persistence:**  
  Batches and their orders are saved in MongoDB.  
  Orders’ statuses are updated to reflect assignment.

---

## Benefits

- **Distance Reduction:** Orders are grouped to minimize total travel.
- **Time & Fuel Savings:** Efficient routes mean less time and fuel spent.
- **Balanced Workload:** Constraints ensure no driver is overloaded.
- **Scalability:** Handles hundreds to thousands of orders efficiently.

---

## Example Flow

1. Supervisor uploads 100 orders.
2. System geocodes all unique pincodes.
3. K-Means clusters orders into ~4 groups.
4. Each group is checked for constraints; if needed, further split.
5. 4–5 batches are created, each with ≤30 orders and ≤25kg.
6. Orders are marked as `ASSIGNED`, ready for driver assignment.

---

**In summary:**  
SiloDispatch’s clustering logic combines real geocoding, K-Means clustering, and business rule enforcement to automate and optimize the creation of delivery batches, resulting in significant operational improvements. 
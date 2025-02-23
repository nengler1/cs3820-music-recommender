import matplotlib.pyplot as plt
import numpy as np
import os
import pandas as pd
import plotly.express as px 
import seaborn as sns
import warnings

from scipy.spatial.distance import cdist
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.metrics import euclidean_distances
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
# from yellowbrick.target import FeatureCorrelation


def get_decade(year): # FROM KAGGLE TUTORIAL
    period_start = int(year/10) * 10
    decade = '{}s'.format(period_start)
    return decade

# ALL FOLLOWING FROM KAGGLE TUTORIAL
warnings.filterwarnings("ignore")
data = pd.read_csv("./data/data.csv")
genre_data = pd.read_csv('./data/data_by_genres.csv')
year_data = pd.read_csv('./data/data_by_year.csv')
print(data.info())
print(genre_data.info())
print(year_data.info())

data['decade'] = data['year'].apply(get_decade)
sns.set(rc={'figure.figsize':(11 ,6)})
sns.countplot(data['decade'])
plt.show()
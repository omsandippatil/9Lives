// ai-ml-topics.ts
export interface AIMlTopic {
  id: number
  name: string
  category: string
  emoji: string
}

export const aiMlTopics: AIMlTopic[] = [
  // Introduction
  { id: 1, name: "Introduction to AI & ML", category: "Introduction", emoji: "🤖" },

  // Mathematics
  { id: 2, name: "Probability & Statistics Basics", category: "Mathematics", emoji: "📊" },
  { id: 3, name: "Probability Distributions", category: "Mathematics", emoji: "📈" },
  { id: 4, name: "Linear Algebra for ML", category: "Mathematics", emoji: "🔢" },
  { id: 5, name: "Calculus for Optimization", category: "Mathematics", emoji: "∂" },
  { id: 6, name: "Information Theory", category: "Mathematics", emoji: "ℹ️" },
  { id: 7, name: "Optimization Theory", category: "Mathematics", emoji: "🎯" },
  { id: 8, name: "Markov Chains & HMMs", category: "Mathematics", emoji: "🔗" },
  { id: 9, name: "Bayesian Inference & PGMs", category: "Mathematics", emoji: "🎲" },

  // Data Preparation
  { id: 10, name: "Data Preprocessing & Cleaning", category: "Data Preparation", emoji: "🧹" },
  { id: 11, name: "Feature Engineering", category: "Data Preparation", emoji: "⚙️" },
  { id: 12, name: "Feature Scaling & Normalization", category: "Data Preparation", emoji: "📏" },
  { id: 13, name: "Handling Missing Values", category: "Data Preparation", emoji: "❓" },
  { id: 14, name: "Handling Imbalanced Data", category: "Data Preparation", emoji: "⚖️" },
  { id: 15, name: "Data Augmentation Techniques", category: "Data Preparation", emoji: "🔄" },
  { id: 16, name: "Exploratory Data Analysis (EDA)", category: "Data Preparation", emoji: "🔍" },
  { id: 17, name: "Data Splitting", category: "Data Preparation", emoji: "✂️" },

  // Core ML
  { id: 18, name: "Supervised vs Unsupervised Learning", category: "Core ML", emoji: "🎓" },
  { id: 19, name: "Linear Regression", category: "Core ML", emoji: "📉" },
  { id: 20, name: "Logistic Regression", category: "Core ML", emoji: "📊" },
  { id: 21, name: "Decision Trees", category: "Core ML", emoji: "🌳" },
  { id: 22, name: "Random Forests & Ensemble Methods", category: "Core ML", emoji: "🌲" },
  { id: 23, name: "Gradient Boosting (XGBoost, LightGBM, CatBoost)", category: "Core ML", emoji: "🚀" },
  { id: 24, name: "k-Nearest Neighbors (kNN)", category: "Core ML", emoji: "👥" },
  { id: 25, name: "Naive Bayes", category: "Core ML", emoji: "🎯" },
  { id: 26, name: "Support Vector Machines (SVMs)", category: "Core ML", emoji: "🔗" },
  { id: 27, name: "Clustering (K-means, DBSCAN, Hierarchical)", category: "Core ML", emoji: "🎪" },
  { id: 28, name: "Dimensionality Reduction (PCA, t-SNE, LDA)", category: "Core ML", emoji: "📐" },

  // Model Evaluation
  { id: 29, name: "Evaluation Metrics", category: "Model Evaluation", emoji: "📏" },
  { id: 30, name: "Bias-Variance Tradeoff", category: "Model Evaluation", emoji: "⚖️" },
  { id: 31, name: "Overfitting & Underfitting", category: "Model Evaluation", emoji: "🎪" },
  { id: 32, name: "Cross-Validation Techniques", category: "Model Evaluation", emoji: "✔️" },
  { id: 33, name: "Hyperparameter Tuning", category: "Model Evaluation", emoji: "🔧" },

  // Deep Learning
  { id: 34, name: "Basics of Neural Networks", category: "Deep Learning", emoji: "🧠" },
  { id: 35, name: "Feedforward Networks & Backpropagation", category: "Deep Learning", emoji: "⚡" },
  { id: 36, name: "Convolutional Neural Networks (CNNs)", category: "Deep Learning", emoji: "👁️" },
  { id: 37, name: "Recurrent Neural Networks (RNNs)", category: "Deep Learning", emoji: "🔄" },
  { id: 38, name: "LSTMs & GRUs", category: "Deep Learning", emoji: "🧠" },
  { id: 39, name: "Autoencoders", category: "Deep Learning", emoji: "🔄" },
  { id: 40, name: "Generative Adversarial Networks (GANs)", category: "Deep Learning", emoji: "🎭" },
  { id: 41, name: "Attention Mechanisms", category: "Deep Learning", emoji: "👀" },
  { id: 42, name: "Transformers", category: "Deep Learning", emoji: "🤖" },
  { id: 43, name: "Large Language Models (LLMs)", category: "Deep Learning", emoji: "💬" },

  // Advanced ML
  { id: 44, name: "Reinforcement Learning", category: "Advanced ML", emoji: "🎮" },
  { id: 45, name: "Multi-Agent Reinforcement Learning", category: "Advanced ML", emoji: "👾" },
  { id: 46, name: "Recommender Systems", category: "Advanced ML", emoji: "💡" },
  { id: 47, name: "Time Series Forecasting", category: "Advanced ML", emoji: "📅" },
  { id: 48, name: "Computer Vision Advanced", category: "Advanced ML", emoji: "📷" },
  { id: 49, name: "Natural Language Processing", category: "Advanced ML", emoji: "📝" },
  { id: 50, name: "Speech & Audio Processing", category: "Advanced ML", emoji: "🎤" },
  { id: 51, name: "Causal Inference in AI", category: "Advanced ML", emoji: "🔗" },
  { id: 52, name: "Meta-Learning", category: "Advanced ML", emoji: "🧠" },
  { id: 53, name: "Evolutionary Algorithms & Genetic Programming", category: "Advanced ML", emoji: "🧬" },
  { id: 54, name: "Knowledge Graphs & Graph Neural Networks (GNNs)", category: "Advanced ML", emoji: "🕸️" },

  // AI Ethics & Interpretability
  { id: 55, name: "Feature Importance & Explainability", category: "AI Ethics & Interpretability", emoji: "🔍" },
  { id: 56, name: "Advanced Explainable AI", category: "AI Ethics & Interpretability", emoji: "💡" },
  { id: 57, name: "Fairness, Bias & Ethical AI", category: "AI Ethics & Interpretability", emoji: "⚖️" },
  { id: 58, name: "Privacy-Preserving ML", category: "AI Ethics & Interpretability", emoji: "🔒" },

  // MLOps
  { id: 59, name: "ML Pipelines", category: "MLOps", emoji: "🔄" },
  { id: 60, name: "Experiment Tracking", category: "MLOps", emoji: "📊" },
  { id: 61, name: "Data Versioning", category: "MLOps", emoji: "📝" },
  { id: 62, name: "Feature Stores", category: "MLOps", emoji: "🏪" },
  { id: 63, name: "Model Deployment Basics", category: "MLOps", emoji: "🚀" },
  { id: 64, name: "CI/CD for ML Models", category: "MLOps", emoji: "🔄" },
  { id: 65, name: "Model Monitoring & Drift Detection", category: "MLOps", emoji: "📈" },
  { id: 66, name: "Scalable Data Pipelines", category: "MLOps", emoji: "🔧" },
  { id: 67, name: "MLOps", category: "MLOps", emoji: "⚙️" },
  { id: 68, name: "Cloud AI Services", category: "MLOps", emoji: "☁️" },
  { id: 69, name: "Edge AI & TinyML", category: "MLOps", emoji: "📱" },

  // AI Applications
  { id: 70, name: "AI in Healthcare", category: "AI Applications", emoji: "🏥" },
  { id: 71, name: "AI in Finance", category: "AI Applications", emoji: "💰" },
  { id: 72, name: "AI in Autonomous Systems & Robotics", category: "AI Applications", emoji: "🤖" },

  // Emerging AI
  { id: 73, name: "Quantum Machine Learning", category: "Emerging AI", emoji: "⚛️" },
  { id: 74, name: "Artificial General Intelligence (AGI) concepts", category: "Emerging AI", emoji: "🌟" },
  { id: 75, name: "Emerging AI Trends", category: "Emerging AI", emoji: "🚀" }
]

let pyodide;
let playlist = { head: null, tail: null, current: null };
let history = [];
let bst = null;

// Initialize Pyodide and Python DSA logic
async function loadPyodideAndRun() {
  pyodide = await loadPyodide();
  await pyodide.loadPackage("numpy");
  await pyodide.runPythonAsync(`
import numpy as np

class Node:
    def __init__(self, song, rating, genre):
        self.song = song
        self.rating = rating
        self.genre = genre
        self.prev = None
        self.next = None

class Playlist:
    def __init__(self):
        self.head = None
        self.tail = None
        self.current = None
    
    def add_song(self, song, rating, genre):
        new_node = Node(song, rating, genre)
        if not self.head:
            self.head = self.tail = new_node
            self.current = new_node
        else:
            new_node.prev = self.tail
            self.tail.next = new_node
            self.tail = new_node
        return song
    
    def navigate(self, direction):
        if not self.current:
            return None
        if direction == "next" and self.current.next:
            self.current = self.current.next
        elif direction == "prev" and self.current.prev:
            self.current = self.current.prev
        return self.current.song if self.current else None

class PlaybackHistory:
    def __init__(self):
        self.stack = []
    
    def play_song(self, song):
        self.stack.append(song)
        return song
    
    def undo(self):
        return self.stack.pop() if self.stack else None

class BSTNode:
    def __init__(self, rating, song):
        self.rating = rating
        self.songs = [song]
        self.left = None
        self.right = None

class SongRatingTree:
    def __init__(self):
        self.root = None
    
    def insert(self, rating, song):
        if not self.root:
            self.root = BSTNode(rating, song)
        else:
            self._insert(self.root, rating, song)
    
    def _insert(self, node, rating, song):
        if rating == node.rating:
            node.songs.append(song)
        elif rating < node.rating:
            if node.left is None:
                node.left = BSTNode(rating, song)
            else:
                self._insert(node.left, rating, song)
        else:
            if node.right is None:
                node.right = BSTNode(rating, song)
            else:
                self._insert(node.right, rating, song)
    
    def search(self, rating):
        node = self.root
        while node:
            if rating == node.rating:
                return node.songs
            elif rating < node.rating:
                node = node.left
            else:
                node = node.right
        return []

def kmeans(songs, k=2):
    if not songs:
        return []
    centroids = songs[:k]
    for _ in range(5):  # Limited iterations for performance
        clusters = [[] for _ in range(k)]
        for song in songs:
            distances = [np.sum((np.array(song[1:]) - np.array(c[1:]))**2) for c in centroids]
            clusters[distances.index(min(distances))].append(song)
        centroids = [np.mean([s[1:] for s in cluster], axis=0).tolist() for cluster in clusters if cluster]
    return [song[0] for song in clusters[0]]  # Return song names from first cluster
`);
  pyodide.runPython(`
playlist = Playlist()
history = PlaybackHistory()
bst = SongRatingTree()
songs_for_clustering = []
`);
}

// UI Interaction Functions
function addSong() {
  const song = document.getElementById("songInput").value;
  const rating = parseInt(document.getElementById("ratingInput").value) || 1;
  const genre = document.getElementById("genreInput").value || "Unknown";
  if (song) {
    pyodide.runPython(`playlist.add_song("${song}", ${rating}, "${genre}")`);
    pyodide.runPython(`bst.insert(${rating}, "${song}")`);
    pyodide.runPython(`songs_for_clustering.append(["${song}", ${rating}, "${genre}"])`);
    updateUI();
  }
}

function navigate(direction) {
  const song = pyodide.runPython(`playlist.navigate("${direction}")`);
  if (song) {
    pyodide.runPython(`history.play_song("${song}")`);
    updateUI();
  }
}

function undoPlayback() {
  const song = pyodide.runPython(`history.undo()`);
  updateUI();
}

function searchByRating() {
  const rating = parseInt(document.getElementById("ratingInput").value) || 1;
  const songs = pyodide.runPython(`bst.search(${rating})`);
  document.getElementById("ratingSearch").textContent = `Rating Search: [${songs.join(", ")}]`;
}

function recommendSongs() {
  const recommendations = pyodide.runPython(`kmeans(songs_for_clustering)`);
  document.getElementById("recommendations").textContent = `Recommendations: [${recommendations.join(", ")}]`;
}

function updateUI() {
  let current = pyodide.runPython(`playlist.current.song if playlist.current else "None"`);
  document.getElementById("currentSong").textContent = `Current Song: ${current}`;
  let songs = [];
  let node = pyodide.runPython(`playlist.head`);
  while (node) {
    songs.push(pyodide.runPython(`node.song`));
    node = pyodide.runPython(`node.next`);
  }
  document.getElementById("playlist").textContent = `Playlist: [${songs.join(", ")}]`;
  let historySongs = pyodide.runPython(`history.stack`);
  document.getElementById("history").textContent = `Playback History: [${historySongs.join(", ")}]`;
}

// p5.js Visualization
function setup() {
  let canvas = createCanvas(600, 300);
  canvas.parent('canvas-container');
}

function draw() {
  background(255);
  let x = 50, y = 100;
  let node = pyodide.runPython(`playlist.head`);
  while (node) {
    let song = pyodide.runPython(`node.song`);
    let rating = pyodide.runPython(`node.rating`);
    fill(74, 144, 226);
    ellipse(x, y, 50, 30);
    fill(255);
    textAlign(CENTER, CENTER);
    text(`${song} (${rating})`, x, y);
    if (pyodide.runPython(`node.next`)) {
      line(x + 25, y, x + 75, y);
    }
    x += 100;
    node = pyodide.runPython(`node.next`);
  }
  // Draw BST
  let bstX = 50, bstY = 200;
  let bstNode = pyodide.runPython(`bst.root`);
  if (bstNode) {
    drawBST(bstNode, bstX, bstY, 100, 1);
  }
}

function drawBST(node, x, y, offset, level) {
  if (!node) return;
  let rating = pyodide.runPython(`node.rating`);
  let songs = pyodide.runPython(`node.songs`);
  fill(74, 144, 226);
  ellipse(x, y, 50, 30);
  fill(255);
  textAlign(CENTER, CENTER);
  text(`${rating}: ${songs[0]}`, x, y);
  let left = pyodide.runPython(`node.left`);
  let right = pyodide.runPython(`node.right`);
  if (left) {
    line(x, y + 15, x - offset, y + 50);
    drawBST(left, x - offset, y + 50, offset / 2, level + 1);
  }
  if (right) {
    line(x, y + 15, x + offset, y + 50);
    drawBST(right, x + offset, y + 50, offset / 2, level + 1);
  }
}

// Initialize Pyodide
loadPyodideAndRun();
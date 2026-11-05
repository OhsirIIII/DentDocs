"""Flat version snapshots; the document owns the single history index."""
import copy


def snapshot(data):
    # Drop history before copying, including on legacy rows with nested histories.
    return copy.deepcopy({key: value for key, value in data.items() if key != 'versionHistory'})


def document_data(data):
    return {**snapshot(data), 'versionHistory': [snapshot(entry) for entry in data.get('versionHistory', [])]}

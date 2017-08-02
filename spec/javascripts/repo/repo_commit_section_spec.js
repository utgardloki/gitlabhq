import Vue from 'vue';
import repoCommitSection from '~/repo/repo_commit_section.vue';
import RepoStore from '~/repo/repo_store';
import RepoHelper from '~/repo/repo_helper';
import Api from '~/api';

fdescribe('RepoCommitSection', () => {
  const branch = 'master';
  const openedFiles = [{
    id: 0,
    changed: true,
    url: `${branch}/url0`,
    newContent: 'a',
  }, {
    id: 1,
    changed: true,
    url: `${branch}/url1`,
    newContent: 'b',
  }, {
    id: 2,
    changed: false,
  }];

  function createComponent() {
    const RepoCommitSection = Vue.extend(repoCommitSection);

    return new RepoCommitSection().$mount();
  }

  it('renders a commit section', () => {
    RepoStore.isCommitable = true;
    RepoStore.targetBranch = branch;
    RepoStore.openedFiles = openedFiles;

    spyOn(RepoHelper, 'getBranch').and.returnValue(branch);

    const vm = createComponent();
    const changedFiles = [...vm.$el.querySelectorAll('.changed-files > li')];
    const commitMessage = vm.$el.querySelector('#commit-message');
    const submitCommit = vm.$el.querySelector('.submit-commit');
    const targetBranch = vm.$el.querySelector('.target-branch');

    expect(vm.$el.querySelector(':scope > form')).toBeTruthy();
    expect(vm.$el.querySelector('.staged-files').textContent).toEqual('Staged files (2)');
    expect(changedFiles.length).toEqual(2);

    changedFiles.forEach((changedFile, i) => {
      const filePath = RepoHelper.getFilePathFromFullPath(openedFiles[i].url, branch);

      expect(changedFile.textContent).toEqual(filePath);
    });

    expect(commitMessage.tagName).toEqual('TEXTAREA');
    expect(commitMessage.name).toEqual('commit-message');
    expect(submitCommit.type).toEqual('submit');
    expect(submitCommit.disabled).toBeTruthy();
    expect(submitCommit.querySelector('.fa-spinner.fa-spin')).toBeFalsy();
    expect(vm.$el.querySelector('.commit-summary').textContent).toEqual('Commit 2 files');
    expect(targetBranch.querySelector(':scope > label').textContent).toEqual('Target branch');
    expect(targetBranch.querySelector('.help-block').textContent).toEqual(branch);
  });

  it('does not render if not isCommitable', () => {
    RepoStore.isCommitable = false;
    RepoStore.openedFiles = [{
      id: 0,
      changed: true,
    }];

    const vm = createComponent();

    expect(vm.$el.innerHTML).toBeFalsy();
  });

  it('does not render if no changedFiles', () => {
    RepoStore.isCommitable = true;
    RepoStore.openedFiles = [];

    const vm = createComponent();

    expect(vm.$el.innerHTML).toBeFalsy();
  });

  it('shows commit submit and summary if commitMessage and spinner if submitCommitsLoading', (done) => {
    const projectId = 'projectId';
    const commitMessage = 'commitMessage';
    RepoStore.isCommitable = true;
    RepoStore.openedFiles = openedFiles;
    RepoStore.projectId = projectId;

    spyOn(RepoHelper, 'getBranch').and.returnValue(branch);

    const vm = createComponent();
    const commitMessageEl = vm.$el.querySelector('#commit-message');
    const submitCommit = vm.$el.querySelector('.submit-commit');

    vm.commitMessage = commitMessage;

    Vue.nextTick(() => {
      expect(commitMessageEl.value).toBe(commitMessage);
      expect(submitCommit.disabled).toBeFalsy();

      spyOn(vm, 'makeCommit').and.callThrough();
      spyOn(Api, 'commitMultiple');

      submitCommit.click();

      Vue.nextTick(() => {
        expect(vm.makeCommit).toHaveBeenCalled();
        expect(submitCommit.querySelector('.fa-spinner.fa-spin')).toBeTruthy();

        const args = Api.commitMultiple.calls.allArgs()[0];
        const { commit_message, actions, branch: payloadBranch } = args[1];

        expect(args[0]).toBe(projectId);
        expect(commit_message).toBe(commitMessage);
        expect(actions.length).toEqual(2);
        expect(payloadBranch).toEqual(branch);
        expect(actions[0].action).toEqual('update');
        expect(actions[1].action).toEqual('update');
        expect(actions[0].content).toEqual(openedFiles[0].newContent);
        expect(actions[1].content).toEqual(openedFiles[1].newContent);
        expect(actions[0].file_path).toEqual(RepoHelper.getFilePathFromFullPath(openedFiles[0].url, branch));
        expect(actions[1].file_path).toEqual(RepoHelper.getFilePathFromFullPath(openedFiles[1].url, branch));

        done();
      });
    });
  });
});
